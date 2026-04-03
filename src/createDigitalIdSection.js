export default function createDigitalIdSection({
    instance,
    UIState,
    el,
    enableButton,
    clearDigitalIDInformation,
    text,
    spacer
}) {
    const fileNameLabel = el('span', { id: 'digitalIDFileNameLabel', textContent: '' });

    const passwordField = el('input', {
        id: 'inputPassword',
        type: 'password',
        disabled: true,
        value: UIState.password,
        style: 'width:100%;',
    });
    passwordField.addEventListener('change', () => {
        UIState.password = passwordField.value.trim();
    });

    const showPasswordBtn = el('button', { textContent: 'Show' });
    enableButton(showPasswordBtn, true);
    showPasswordBtn.onclick = () => {
        const show = showPasswordBtn.textContent === 'Show';
        showPasswordBtn.textContent = show ? 'Hide' : 'Show';
        passwordField.type = show ? 'text' : 'password';
    };

    const clearBtn = el('button', { textContent: 'Clear Digital ID Information' });
    enableButton(clearBtn, false);
    clearBtn.onclick = () => {
        clearDigitalIDInformation(instance);
        // DOM gets reset inside clearDigitalIDInformation
    };

    const pickBtn = el('button', { textContent: 'Select Digital ID File' });
    enableButton(pickBtn, true);
    pickBtn.onclick = () => {
        const inputFile = el('input', {
            id: 'inputFile',
            type: 'file',
            accept: '.pfx',
            style: 'display:none;',
        });

        inputFile.onchange = e => {
            const file = e.target.files?.[0] ?? null;
            UIState.certificateFile = file;

            if (file) {
                fileNameLabel.textContent = file.name;
                enableButton(clearBtn, true);
                passwordField.disabled = false;
            }
        };

        inputFile.click();
    };

    return el('div', { id: 'digitalIDDiv' }, [
        el('h3', { textContent: 'Digital ID (Optional)' }),
        text(
            'A default Apryse Digital ID will be used if no Digital ID is provided. ' +
            'We encourage using a non-confidential Digital ID file, but none of the provided data is saved to Apryse servers.',
        ),
        spacer(),
        pickBtn,
        spacer(),
        fileNameLabel,
        spacer(),
        text('Digital ID Password:'),
        spacer(),
        passwordField,
        showPasswordBtn,
        spacer(),
        clearBtn,
    ]);
};