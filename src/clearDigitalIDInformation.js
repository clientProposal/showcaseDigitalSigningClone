export default function clearDigitalIDInformation(instance) {
  const { UI } = instance;
  UI.showWarningMessage({
    title: 'Confirm Clearing Digital ID Information',
    message:
      'This will reset the input password and clear the uploaded .pfx file. Are you sure?',
    onConfirm: () => {
      UIState.certificateUrl = defaultCertificateUrl;
      UIState.password = 'password';
      digitalID = null;

      const root = currentPanelRoot;
      if (!root) return;

      const digitalIDFileNameLabel = root.querySelector('#digitalIDFileNameLabel');
      if (digitalIDFileNameLabel) digitalIDFileNameLabel.textContent = '';

      const passwordField = root.querySelector('#inputPassword');
      if (passwordField) {
        passwordField.value = UIState.password;
        passwordField.disabled = true;
      }
    },
  });
}