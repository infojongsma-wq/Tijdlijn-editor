/** De gebouwde kijk-pagina als tekst; zie het tijdlijn-kijkpagina-plugin in
 *  vite.config.ts. Leeg als hij nog niet gebouwd is. */
declare module 'virtual:kijkpagina' {
  const html: string
  export default html
}
