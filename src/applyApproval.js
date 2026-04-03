import { UIState } from './root';
// Import shared UI state (password, certificate URL, signature info, etc.)

export default async function applyApproval(instance) {
  // Export the main async function that applies a digital signature, given a WebViewer instance

  const { UI } = instance;
  // Grab the UI helper API from the instance for showing messages, loading docs, etc.

  const { annotationManager, SaveOptions, PDFNet, documentViewer } = instance.Core;
  // Destructure core APIs: annotation manager, save flags, PDFNet SDK, and document viewer

  const xfdfString = await annotationManager.exportAnnotations();
  // Export all current annotations as an XFDF string so they can be baked into the signed PDF

  const data = await documentViewer.getDocument().getFileData({
    xfdfString,
    flags: SaveOptions.INCREMENTAL,
  });
  // Get the current document bytes with annotations applied, using incremental save

  // --- We must use incremental save to avoid invalidating the signature ---
  // Other types cause invalidation:
  // e_remove_unused -> Drops unused objects and rewrites structure/xref, so referenced object offsets and surrounding bytes shift, altering regions previously covered by signatures.
  // e_compatibility / e_full -> Re-saves the document in a broadly compatible form, potentially normalizing, recompressing, or rewriting objects and xref, changing bytes inside already‑signed ranges. 
  // e_linearized -> Rewrites the whole file for fast web view, rearranging objects and xref so bytes inside existing ByteRange change, breaking prior signatures.

  await PDFNet.initialize();
  // Initialize the PDFNet library to use its APIs

  await PDFNet.runWithCleanup(async () => {
    // Anything created by PDFNet will be cleaned up after

    const doc = await PDFNet.PDFDoc.createFromBuffer(new Uint8Array(data));
    // Create a PDFDoc object in memory from the document bytes

    const digSigFieldIterator = await doc.getDigitalSignatureFieldIteratorBegin();
    // Get an iterator over all digital signature fields in the document

    let foundOneDigitalSignature = false;
    // Track whether the document already has at least one visible digital signature

    for (digSigFieldIterator; await digSigFieldIterator.hasNext(); digSigFieldIterator.next()) {
      // Iterate over each digital signature field

      const field = await digSigFieldIterator.current();
      // Get the current field from the iterator

      if (await field.hasVisibleAppearance()) {
        // Check if this signature field has a visible appearance (not invisible)

        foundOneDigitalSignature = true;
        // Mark that we found at least one visible digital signature

        break;
        // Stop scanning; we only care whether at least one visible signature exists
      }
    }

    await doc.lock();
    // Lock the document for thread-safe modification

    try {
      const widgetsToSign = JSON.parse(JSON.stringify(instance.widgetsToDigitallySign));
      // Deep-clone the list of widgets (signature fields) that should be signed on this run

      if (!widgetsToSign.length) {
        // If no widgets were specified, fall back to creating an invisible signature field

        const fieldName = 'Signature1-invisible';
        // Name to use for the invisible signature field

        const field = await doc.fieldCreate(fieldName, PDFNet.Field.Type.e_signature);
        // Create a new signature field in the document

        const page1 = await doc.getPage(1);
        // Get the first page of the document

        const widgetAnnot = await PDFNet.WidgetAnnot.create(
          await doc.getSDFDoc(),
          await PDFNet.Rect.init(0, 0, 0, 0),
          field,
        );
        // Create an invisible widget annotation (0x0 rect) tied to the signature field

        page1.annotPushBack(widgetAnnot);
        // Add the widget annotation to the page's annotation list

        widgetAnnot.setPage(page1);
        // Explicitly set the page for this widget annotation

        const widgetObj = await widgetAnnot.getSDFObj();
        // Get the low-level SDF object backing the widget

        const F = 128 | 4; // = 132

        // /F = annotation flags (an integer bitmask) 
        // Set annotation flags (e.g., Print/Locked/etc.) as a numeric bitmask
        // 132, because...
        // 128 (Locked, 8th bit, Math.pow(2,8-1) 
        // + 
        // 4 (Print, 3rd bit, Math.pow(2,3-1))
        // https://opensource.adobe.com/dc-acrobat-sdk-docs/standards/pdfstandards/pdf/PDF32000_2008.pdf#page=393
        

        widgetObj.putNumber('F', F);

        widgetObj.putName('Type', 'Annot');
        // Mark the SDF object as an annotation type

        widgetsToSign.push({ label: fieldName });
        // Add this new invisible signature field to the list to be signed
      }

      const visited = [];
      // Track which signature field names we've already processed to avoid duplicates

      let buf;
      // Will hold the final signed PDF bytes after saving

      for (let i = 0; i < widgetsToSign.length; i++) {
        // Loop over each widget that needs to be signed

        let sigField;
        // Will hold the DigitalSignatureField corresponding to the current widget

        const widgetFieldName = widgetsToSign[i].label;
        // Expected field name for this widget (coming from the UI / annotation selection)

        const fieldIterator = await doc.getFieldIteratorBegin();
        // Start an iterator over *all* fields in the document

        for (; await fieldIterator.hasNext(); fieldIterator.next()) {
          // Iterate through fields until we find the matching signature field

          const field = await fieldIterator.current();
          // Current field in the iteration

          if (!(await field.isValid()) || (await field.getType()) !== PDFNet.Field.Type.e_signature) {
            // Skip fields that are invalid or not of signature type

            continue;
          }

          const fieldName = await field.getName();
          // Get the field's name string

          if (!visited.includes(fieldName) && widgetFieldName === fieldName) {
            // If we haven't processed this field yet and the name matches the widget's label

            visited.push(fieldName);
            // Mark this field as processed so it isn’t signed twice

            sigField = await PDFNet.DigitalSignatureField.createFromField(field);
            // Wrap the generic field as a DigitalSignatureField so we can sign it

            break;
            // Stop scanning; we found the field for this widget
          }
        }

        if (!sigField) throw new Error('The document does not contain a signature field');
        // If we never found a matching signature field, something is wrong; abort with error

        if (!foundOneDigitalSignature) {
          // If the document had no visible signatures before this signing run

          await sigField.setDocumentPermissions(
            PDFNet.DigitalSignatureField.DocumentPermissions
              .e_annotating_formfilling_signing_allowed,
          );
          // Set document permissions so that annotating/form filling/signing are allowed post-sign
        }

        // URL-only signature credential (served from /public)
        await sigField.signOnNextSaveFromURL(UIState.certificateUrl, UIState.password);
        // Sign this signature field using a certificate accessible at a URL with the provided password

        await sigField.setLocation(UIState.signatureInformation[0].value);
        // Set the signature's "Location" attribute from UIState

        await sigField.setReason(UIState.signatureInformation[1].value);
        // Set the signature's "Reason" attribute from UIState

        await sigField.setContactInfo(UIState.signatureInformation[2].value);
        // Set the signature's "Contact Info" attribute from UIState

        buf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_incremental);
        // Save the document to memory using incremental saving, updating %buf with latest bytes
      }

      UI.setActiveTabInPanel({ tabPanel: 'tabPanel', tabName: 'signaturePanel' });
      // Switch the UI to the signature panel tab so the user can inspect the new signature

      const blob = new Blob([buf], { type: 'application/pdf' });
      // Wrap the signed PDF bytes in a Blob so we can load/download it

      instance.signedBlob = blob;
      // Cache the signed Blob on the instance (e.g., for custom Download behavior later)

      UI.loadDocument(blob, { filename: documentViewer.getDocument().filename });
      // Reload the viewer with the newly signed PDF, preserving the original filename
    } catch (e) {
      // Handle any errors that occur during signing

      console.log(e);
      // Log the error for debugging

      UI.showWarningMessage({
        title: 'Digital ID Error',
        message:
          'There is an issue with the Digital ID file or password.  The private key could not be parsed.',
      });
      // Show a user-facing warning if the certificate or password could not be used
    }
  });
  // End of runWithCleanup: PDFNet will clean up resources once this async block resolves
}