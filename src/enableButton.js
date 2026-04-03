
export default (button, state) => {
  button.disabled = !state;
  button.style.backgroundColor = state ? 'blue' : 'gray';
  button.style.color = state ? 'white' : 'darkgray';
};