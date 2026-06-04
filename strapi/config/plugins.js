/**
 * CKEditor: ενεργοποίησε ΜΟΝΟ αφού το nginx στέλνει JS (όχι HTML):
 *   curl -s https://the37n.gr/ckeditor5/ckeditor-config | head -1
 * → globalThis.CKEditorConfig
 * Μετά ξανάβαλε το block ckeditor5 και preset articleSimple στο schema.
 */
module.exports = {
  // ckeditor5: {
  //   enabled: true,
  //   resolve: './node_modules/@_sh/strapi-plugin-ckeditor',
  // },
};
