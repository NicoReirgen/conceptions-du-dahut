/**
 * Silence les rejets d'une transition de vue abandonnée.
 *
 * Quand le navigateur renonce à une transition — document en arrière-plan,
 * navigation enchaînée, préférence « animations réduites » —, il rejette
 * `ready` et `updateCallbackDone` avec `AbortError: Transition was skipped`.
 * Le plugin de Nuxt n'attrape que `finished` : les deux autres remontent en
 * rejets non gérés, et le navigateur les journalise comme des erreurs.
 *
 * Rien n'est cassé pour autant — c'est le déroulement normal d'une transition
 * abandonnée. Mais Lighthouse compte ces erreurs, et elles coûtaient quatre
 * points de bonnes pratiques sur trois pages.
 *
 * On n'attrape que ces deux promesses-là, jamais les rejets du reste de
 * l'application : une vraie erreur doit rester visible.
 */
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.hook('page:view-transition:start', (transition) => {
        transition?.ready?.catch(() => {})
        transition?.updateCallbackDone?.catch(() => {})
    })
})
