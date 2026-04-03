import el from './createElement';

export default function createSignatureInfoSection({ UIState, text, spacer }) {
    const section = el('div', { id: 'signatureInfoDiv' }, [
      el('h3', { textContent: 'Signature Information (Optional)' }),
    ]);

    UIState.signatureInformation.forEach(({ id, label, value }, idx) => {
      const input = el('input', {
        id: `input${id}`,
        type: 'text',
        value,
        style: 'width:100%;',
      });

      input.addEventListener('input', () => {
        UIState.signatureInformation[idx].value = input.value.trim();
      });

      section.appendChild(spacer());
      section.appendChild(text(`${label}:`));
      section.appendChild(spacer());
      section.appendChild(input);
    });

    return section;
  };