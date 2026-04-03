  export default function el (tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    children.forEach(c =>
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c),
    );
    return node;
  };