/**
 * Code.gs — punto de entrada del Web App. Esto es lo que se publica
 * (Implementar > Nueva implementación > Aplicación web) y lo que se embebe
 * en Sites (Insertar > Insertar > Por URL, con la URL del web app).
 *
 *   sinparámetros          → vistazo general, solo lectura, para cualquiera
 *   ?selector=Romina       → vista de edición de Romina (y solo la de Romina)
 */
function doGet(e) {
  const selector = e.parameter.selector;
  const baseUrl = ScriptApp.getService().getUrl();

  let template;
  if (selector && SELECTORES.indexOf(selector) > -1) {
    template = HtmlService.createTemplateFromFile('SelectorView');
    template.selector = selector;
  } else {
    template = HtmlService.createTemplateFromFile('Index');
    template.vistazo = vistazoBusquedas_();
  }
  template.baseUrl = baseUrl;
  template.selectores = SELECTORES;

  return template.evaluate()
    .setTitle('Portal de Selección')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // necesario para que Sites pueda embeberlo en un iframe
}

/** Para <?!= include('Styles') ?> dentro de los templates HTML. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
