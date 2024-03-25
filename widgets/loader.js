class CustomElementLoader extends HTMLElement {
    connectedCallback() {
      const componentSCR =   this.getAttribute("name");
      const filePath = `./widgets/${componentSCR}.html`
      if (!filePath) {
        console.error("No file path provided");
        return;
      }
  
      fetch(filePath)
        .then(response => response.text())
        .then(html => {
          this.insertAdjacentHTML("beforeend", html);
        })
        .catch(error => console.error(error));
    }
  }
  
  customElements.define("x-widget", CustomElementLoader);
  