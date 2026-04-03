import { useRef, useEffect } from 'react';
import WebViewer from '@pdftron/webviewer';
import { createDigitalSignaturePanelElements } from './root';
import downloadBlob from './downloadBlob';

function App() {
  const viewer = useRef(null);
  const inst = useRef(null);
  const hasBeenInitialized = useRef(false);

  const viewerPanels = useRef(null);
  const tabPanel = useRef({ handle: null, dataElement: 'tabPanel' });
  const digitalSignaturePanel = useRef({ handle: null, dataElement: 'digitalSignaturePanel' });

  const { VITE_PDFTRONKEY: licenseKey } = import.meta.env;

  const fullAPI = true;
  const initialDoc = 'pdfs/test.pdf';
  const path = 'webviewer/';
  const enableFilePicker = true;
  let widgetsToDigitallySign = [];

  useEffect(() => {
    if (hasBeenInitialized.current) return;
    hasBeenInitialized.current = true;

    WebViewer.default(
      {
        path,
        licenseKey,
        initialDoc,
        fullAPI,
        enableFilePicker,
      },
      viewer.current,
    ).then(async instance => {
      inst.current = instance;
      const { UI, Core } = instance;
      const { annotationManager } = Core;
      const flyout = inst.current.UI.Flyouts.getFlyout("MainMenuFlyout");
      const idx = flyout.properties.items.findIndex(i => i.dataElement === "downloadButton");
      const items = flyout.properties.items;

      const DownloadAction = new instance.UI.Components.CustomButton({
      dataElement: 'downloadButton',
        title: 'Download',
        img: 'icon-download',
        onClick: async () => {
          if (instance.signedBlob) {
            const filename =
              instance.Core.documentViewer.getDocument().filename || 'document.pdf';
            downloadBlob(instance.signedBlob, filename);
          } else {
            UI.openElements(['downloadModal']);
          }
        },
      });



      if (idx) {
        items[idx] = DownloadAction;
      }
      flyout.setItems(items);

      UI.setActiveRibbonItem('toolbarGroup-Forms');

      UI.closeElements([tabPanel.current.dataElement]);
      viewerPanels.current = UI.getPanels();

      tabPanel.current.handle = viewerPanels.current.find(
        panel => panel.dataElement === tabPanel.current.dataElement,
      );

      digitalSignaturePanel.current.render = createDigitalSignaturePanelElements(instance, widgetsToDigitallySign);

      UI.addPanel({
        dataElement: digitalSignaturePanel.current.dataElement,
        location: 'left',
        icon:
          '<svg fill="#000000" width="100px" height="100px" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="m 1.0324444,11.139308 ... z"/></svg>',
        title: 'Digital Signature',
        render: () => digitalSignaturePanel.current.render,
      });

      digitalSignaturePanel.current.handle = {
        render: digitalSignaturePanel.current.dataElement,
      };

      tabPanel.current.handle.panelsList = [
        digitalSignaturePanel.current.handle,
        ...tabPanel.current.handle.panelsList,
      ];

      UI.openElements([tabPanel.current.dataElement]);
      UI.setPanelWidth(tabPanel.current.dataElement, 400);
      annotationManager.addEventListener('annotationChanged', async (annotations, action) => {
        if (action === "add") {
          UI.setActiveRibbonItem('toolbarGroup-FillAndSign');
          
        }
        const widgets = annotations.filter(a => a.getType() === "SignatureWidgetAnnotation");
        const isRelatedToSigning = widgets.some(a => a.isSignedByAppearance());

        if (isRelatedToSigning) {
          UI.openElements([tabPanel.current.dataElement]);

          const widgetsToSign = widgets.map((widget) => {
            if (widget.isSignedByAppearance()) {

              const applyApprovalButton = Array.from(digitalSignaturePanel.current.render.children).find(c => c.id === "applyApprovalButton");
              applyApprovalButton.disabled = false;
              applyApprovalButton.style.backgroundColor = 'blue';
              applyApprovalButton.style.color = 'white';

            }


            return {
              label: widget.getField().name,
            };

          });
          instance.widgetsToDigitallySign = widgetsToSign;
          widgetsToDigitallySign = widgetsToSign;
        }
      })

    });
  }, []);

  return (
    <div
      style={{ width: '100vw', height: '100vh' }}
      className="webviewer"
      ref={viewer}
    ></div>
  );
}

export default App;