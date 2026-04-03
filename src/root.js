import clearDigitalIDInformation from './clearDigitalIDInformation';
import applyApproval from './applyApproval';
import verifySignature from './verifySignature';
import enableButton from './enableButton';
import el from './createElement';
import createDigitalIdSection from './createDigitalIdSection';
import createSignatureInfoSection from './createSignatureInfoSection';

const { VITE_PASSWORD: password } = import.meta.env;

export const UIState = {
  password,
  certificateUrl: '/sign.pfx',
  certificateFile: null,

  signatureInformation: [
    { id: 'Location', label: 'Location', value: 'Vancouver, BC, Canada' },
    { id: 'Reason', label: 'Reason', value: 'Cryptographic signature demo' },
    { id: 'ContactInfo', label: 'Contact Information', value: 'apryse.com' },
  ],
};

let digitalID = null;
let currentPanelRoot = null;

export function createDigitalSignaturePanelElements(instance) {

  const text = s => document.createTextNode(s);
  const spacer = () => el('p');
  const divider = () => el('div', { style: 'border-top:1px solid #ccc;margin:10px 0;' });

  const applyBtn = el('button', {
    id: 'applyApprovalButton',
    textContent: 'Apply Approval Signature',
  });

  const verifyBtn = el('button', { textContent: 'Verify Signature' });

  enableButton(applyBtn, false);
  enableButton(verifyBtn, false);

  applyBtn.onclick = () => {
    applyApproval(instance);
    enableButton(verifyBtn, true);
  };

  verifyBtn.onclick = () => verifySignature(instance);

  const panel = el('div', { id: 'digitalSignaturePanel' }, [
    text(
      'In this demo, a digital signature will be applied to the first signature field or an invisible signature field will be added. ' +
      'Sign PDFs with certificates using our JavaScript digital signature library and securely protect digital documents by creating a signing fingerprint uniquely identifying a sender.',
    ),
    divider(),
    createDigitalIdSection({
      instance,
      UIState,
      el,
      enableButton,
      clearDigitalIDInformation,
      text,
      spacer
    }),
    divider(),
    createSignatureInfoSection({ UIState, text, spacer }),
    spacer(),
    applyBtn,
    spacer(),
    verifyBtn,
  ]);

  currentPanelRoot = panel;
  return panel;
}