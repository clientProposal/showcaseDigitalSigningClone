export default function verifySignature(instance) {
  instance.UI.setActiveTabInPanel({ tabPanel: 'tabPanel', tabName: 'signaturePanel' });

  setTimeout(() => {
    const shadowRoot = document.getElementById('wc-viewer')?.shadowRoot;
    const signaturePanelElement = shadowRoot?.querySelector('[data-element="signaturePanel"]');
    if (!signaturePanelElement) return;

    const buttons = Array.from(signaturePanelElement.querySelectorAll('button'));
    const expandBtn = buttons.find((el) => el.ariaLabel?.includes('Expand Signed by Apryse'));
    expandBtn?.click();

    setTimeout(() => {
      const detailsBtn = signaturePanelElement.querySelector(
        'button[aria-label="Signature Details"]',
      );
      detailsBtn?.click();
    }, 200);
  }, 500);
}