---
name: browser-mcp
description: Contrôle automatisé de navigateur pour tests d'interface, validation visuelle, accessibilité, scraping et debugging
license: MIT
compatibility: opencode
metadata:
  mcp-server: browsermcp
  version: '1.0'
  category: testing-automation
---

## Ce que je fais

Je fournis un contrôle complet d'un navigateur réel (Chrome/Chromium) qui te permet de :

- **Tester l'interface** : Valider visuellement le rendu des composants et thèmes
- **Vérifier l'accessibilité** : Analyser l'arbre a11y (roles, labels, aria-\*)
- **Débugger** : Reproduire bugs visuels et capturer screenshots + console logs
- **Scraper des données** : Extraire du contenu depuis des sites web externes
- **Valider des workflows** : Tester des parcours utilisateurs complets
- **Tester PWA** : Vérifier installation, mode offline, notifications

## Quand m'utiliser

Utilise-moi dans les situations suivantes :

### 🎨 Tests visuels et UI

- **Validation de thèmes** : Tester l'apparence des 10 thèmes daisyUI
- **Tests de composants** : Vérifier le rendu visuel de nouveaux composants
- **Tests de responsive** : Valider sur différentes tailles d'écran
- **Vérification de layout** : S'assurer que le layout est correct

### ♿ Accessibilité

- **Audit a11y** : Analyser l'arbre d'accessibilité complet
- **Validation ARIA** : Vérifier roles, labels, aria-\* attributes
- **Tests keyboard** : Valider navigation au clavier
- **Tests screen reader** : Vérifier structure sémantique

### 🐛 Debugging

- **Reproduire bugs** : Automatiser les steps pour reproduire un bug visuel
- **Capturer état** : Screenshots + console logs pour analyse
- **Tests de regression** : Vérifier que les bugs ne reviennent pas

### 🌐 Scraping et extraction

- **Import de questions** : Extraire des questions depuis des sites externes
- **Collecte de données** : Récupérer du contenu web structuré
- **Monitoring** : Vérifier disponibilité de ressources externes

### ✅ Tests d'intégration

- **Workflows utilisateur** : Tester parcours complets (quiz, import, settings)
- **PWA features** : Valider installation, offline, cache
- **Interactions complexes** : Drag & drop, gestures, animations

## Comment m'utiliser

### 1. Navigation

```typescript
// Naviguer vers une URL
browsermcp_browser_navigate({
  url: 'http://localhost:5173',
})

// Navigation arrière/avant
browsermcp_browser_go_back()
browsermcp_browser_go_forward()
```

⚠️ **Important** : Le serveur dev doit être actif (`bun dev`) pour tester l'application locale

### 2. Analyse de la page

```typescript
// Capturer snapshot d'accessibilité (structure complète)
const snapshot = await browsermcp_browser_snapshot()
// Retourne l'arbre a11y avec refs pour interactions

// Exemple de snapshot:
// {
//   "role": "WebArea",
//   "name": "Chiropraxie QCM",
//   "children": [
//     {
//       "role": "button",
//       "name": "Démarrer le quiz",
//       "ref": "btn-start-quiz"
//     },
//     {
//       "role": "combobox",
//       "name": "Sélecteur de thème",
//       "ref": "theme-select"
//     }
//   ]
// }
```

### 3. Interactions

```typescript
// CLIQUER sur un élément
browsermcp_browser_click({
  element: 'Button "Démarrer le quiz"',
  ref: 'btn-start-quiz', // Référence depuis le snapshot
})

// SURVOLER un élément
browsermcp_browser_hover({
  element: 'Theme selector dropdown',
  ref: 'theme-select',
})

// TAPER du texte
browsermcp_browser_type({
  element: 'Search input',
  ref: 'search-input',
  text: 'anatomie',
  submit: false, // true pour presser Enter après
})

// SÉLECTIONNER option(s) dans dropdown
browsermcp_browser_select_option({
  element: 'Theme dropdown',
  ref: 'theme-select',
  values: ['nocturne'], // Peut être un array pour sélection multiple
})

// PRESSER une touche
browsermcp_browser_press_key({
  key: 'Escape', // 'ArrowLeft', 'Enter', 'Tab', etc.
})
```

⚠️ **Refs volatiles** : Les refs changent à chaque render. Toujours recapturer un snapshot après interactions importantes.

### 4. Attente et timing

```typescript
// Attendre un délai fixe (en secondes)
browsermcp_browser_wait({
  time: 2,
})
```

💡 **Best practice** : Utiliser `browser_wait()` après actions qui déclenchent :

- Animations CSS/JS
- Fetch API / appels Ollama
- Transitions de page
- Updates de state React

### 5. Capture et logs

```typescript
// Screenshot de la page actuelle
const screenshot = await browsermcp_browser_screenshot()
// Retourne image base64

// Récupérer logs console
const logs = await browsermcp_browser_get_console_logs()
// Retourne array de {level: 'log'|'warn'|'error', message: string}
```

## Workflow recommandé

### Workflow de base

```
┌─────────────────────────────────┐
│ 1. Lancer serveur dev           │
│    bun dev                      │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 2. browser_navigate()           │
│    http://localhost:5173        │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 3. browser_snapshot()           │
│    Capturer structure page      │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 4. Interactions                 │
│    click, type, select, etc.    │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 5. browser_screenshot()         │
│    Capturer résultat visuel     │
└─────────────────────────────────┘
```

### Workflow avec vérification

```
┌─────────────────────────────────┐
│ 1. Navigation                   │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 2. Snapshot initial             │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 3. Interactions                 │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 4. Attente (si nécessaire)      │
│    browser_wait()               │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 5. Snapshot de vérification     │
│    Valider changements          │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 6. Screenshot + logs            │
│    Documentation/debug          │
└─────────────────────────────────┘
```

## Cas d'usage typiques

### 1. Valider tous les thèmes visuellement

```typescript
// Navigation
await browsermcp_browser_navigate({ url: 'http://localhost:5173' })

// Snapshot pour trouver le sélecteur
const snapshot = await browsermcp_browser_snapshot()

// Boucle sur les 10 thèmes
const themes = [
  'toulouse',
  'nocturne',
  'clown',
  'azure',
  'forest',
  'sunset',
  'ocean',
  'medical',
  'lavande',
  'cupcake',
]

for (const theme of themes) {
  // Sélectionner le thème
  await browsermcp_browser_select_option({
    element: 'Theme selector',
    ref: 'theme-select',
    values: [theme],
  })

  // Attendre transition CSS
  await browsermcp_browser_wait({ time: 0.5 })

  // Capturer screenshot pour validation
  const screenshot = await browsermcp_browser_screenshot()
  console.log(`Theme ${theme} captured`)
}
```

### 2. Tester workflow complet de quiz

```typescript
// 1. Navigation
await browsermcp_browser_navigate({ url: 'http://localhost:5173' })

// 2. Snapshot pour identifier éléments
const homeSnapshot = await browsermcp_browser_snapshot()

// 3. Démarrer quiz
await browsermcp_browser_click({
  element: 'Start quiz button',
  ref: 'btn-start',
})

// 4. Attendre chargement
await browsermcp_browser_wait({ time: 1 })

// 5. Snapshot de la page quiz
const quizSnapshot = await browsermcp_browser_snapshot()

// 6. Répondre à la question
await browsermcp_browser_click({
  element: 'Choice A',
  ref: 'choice-a',
})

// 7. Valider la réponse
await browsermcp_browser_click({
  element: 'Submit answer button',
  ref: 'btn-submit',
})

// 8. Screenshot du résultat
await browsermcp_browser_screenshot()

// 9. Vérifier console logs (pas d'erreurs)
const logs = await browsermcp_browser_get_console_logs()
const errors = logs.filter(log => log.level === 'error')
if (errors.length > 0) {
  console.error('Errors found:', errors)
}
```

### 3. Vérifier l'accessibilité

```typescript
// Navigation
await browsermcp_browser_navigate({ url: 'http://localhost:5173/quiz' })

// Snapshot retourne arbre a11y complet
const a11yTree = await browsermcp_browser_snapshot()

// Vérifications manuelles ou automatiques:
// - Tous les boutons ont un role="button"
// - Tous les inputs ont des labels
// - Navigation possible au clavier
// - ARIA attributes appropriés
// - Structure sémantique correcte

// Exemple: Vérifier que le bouton start existe
const startButton = findInTree(a11yTree, {
  role: 'button',
  name: /démarrer|start/i,
})

if (!startButton) {
  console.error('Start button not found in a11y tree')
}
```

### 4. Scraper des questions depuis un site externe

```typescript
// Navigation vers site public
await browsermcp_browser_navigate({
  url: 'https://example.com/chiropraxie-questions',
})

// Snapshot pour analyser structure
const snapshot = await browsermcp_browser_snapshot()

// Cliquer sur une catégorie
await browsermcp_browser_click({
  element: 'Anatomie category',
  ref: 'cat-anatomie',
})

// Attendre chargement des questions
await browsermcp_browser_wait({ time: 2 })

// Re-snapshot pour obtenir les questions
const questionsSnapshot = await browsermcp_browser_snapshot()

// Parser le snapshot pour extraire questions
// (logique custom selon structure du site)
const questions = parseQuestionsFromSnapshot(questionsSnapshot)
```

### 5. Debugger un bug visuel

```typescript
// Reproduire état problématique
await browsermcp_browser_navigate({ url: 'http://localhost:5173/quiz' })

// Appliquer thème problématique
await browsermcp_browser_click({
  element: 'Theme nocturne',
  ref: 'theme-nocturne',
})

// Déclencher l'action qui cause le bug
await browsermcp_browser_click({
  element: 'Start quiz',
  ref: 'btn-start',
})

// Attendre que le bug apparaisse
await browsermcp_browser_wait({ time: 1 })

// Screenshot pour voir le bug
const screenshot = await browsermcp_browser_screenshot()

// Logs console pour erreurs JS
const logs = await browsermcp_browser_get_console_logs()
const errors = logs.filter(log => log.level === 'error')

// Analyser et documenter
console.log('Bug screenshot captured')
console.log('Console errors:', errors)
```

### 6. Tester les fonctionnalités PWA

```typescript
// 1. Vérifier installation PWA
await browsermcp_browser_navigate({ url: 'http://localhost:5173' })

// 2. Screenshot de la page d'accueil
await browsermcp_browser_screenshot()

// 3. Tester mode offline (nécessite service worker actif)
// Note: Simulation d'offline non supportée directement,
// mais on peut vérifier que l'app charge sans erreurs

// 4. Vérifier manifest et icons
const logs = await browsermcp_browser_get_console_logs()
const manifestWarnings = logs.filter(
  log => log.message.includes('manifest') || log.message.includes('icon')
)

if (manifestWarnings.length > 0) {
  console.warn('PWA manifest warnings:', manifestWarnings)
}
```

## Capacités du serveur MCP

Ce skill s'appuie sur le serveur MCP `browsermcp` configuré dans ton `opencode.json` :

```json
{
  "browsermcp": {
    "type": "local",
    "command": ["npx", "-y", "@executeautomation/browser-mcp"],
    "enabled": true
  }
}
```

**Tools disponibles** :

- `browser_navigate` : Navigation vers URL
- `browser_go_back` / `browser_go_forward` : Navigation historique
- `browser_snapshot` : Capture arbre d'accessibilité
- `browser_click` : Clic sur élément
- `browser_hover` : Survol d'élément
- `browser_type` : Saisie de texte
- `browser_select_option` : Sélection dans dropdown
- `browser_press_key` : Pression de touche clavier
- `browser_wait` : Attente temporisée
- `browser_screenshot` : Capture d'écran
- `browser_get_console_logs` : Récupération logs console

## Bonnes pratiques

### ✅ À FAIRE

1. **Lancer le serveur dev AVANT** : `bun dev` doit être actif
2. **Toujours snapshot avant interactions** : Les refs sont volatiles
3. **Attendre après animations** : Utiliser `browser_wait()` après actions lourdes
4. **Capturer screenshots** : Documentation visuelle utile
5. **Vérifier console logs** : Erreurs JS souvent invisibles visuellement
6. **Descriptions claires** : Le paramètre `element` doit être descriptif
7. **Re-snapshot après changements** : Refs peuvent changer après interactions

### ❌ À ÉVITER

1. **Utiliser des refs obsolètes** : Toujours recapturer après render
2. **Oublier les attentes** : Ne pas enchaîner interactions trop vite
3. **Ignorer les erreurs console** : Peuvent indiquer problèmes cachés
4. **Tests sans serveur** : Browser MCP ne peut pas tester sans serveur actif
5. **Refs hardcodés** : Les refs changent, toujours utiliser ceux du snapshot récent
6. **Trop de wait()** : Optimiser timing, pas attendre aveuglément

## Intégration avec MemoAI

```typescript
// Après validation visuelle d'une feature
await browsermcp_browser_navigate({ url: 'http://localhost:5173' })
// ... tests Browser MCP ...
await browsermcp_browser_screenshot()

// Enregistrer dans MemoAI si OK
await memoai_memo_record({
  content:
    'Feature: Sélecteur de thème avec 10 options. Testé avec Browser MCP, tous les thèmes appliquent correctement les couleurs. Dropdown fonctionne, persistance localStorage OK.',
  type: 'implementation',
  context_files: ['src/components/ThemeSelector.tsx', 'src/stores/settingsStore.ts'],
  tags: ['ui', 'theming', 'browser-tested'],
})

// Workflow complet: Bug → Browser MCP → Fix → Test → MemoAI
```

## Workflow de debugging avec MemoAI

```
┌─────────────────────────────────┐
│ PROBLÈME VISUEL IDENTIFIÉ       │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 1. RECHERCHE MEMOAI             │
│    Bugs similaires passés       │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 2. REPRODUCTION BROWSER MCP     │
│    Navigate, interact, wait     │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 3. CAPTURE                      │
│    Screenshot + console logs    │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 4. FIX + TEST AVEC BROWSER MCP  │
│    Valider correction           │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 5. ENREGISTREMENT MEMOAI        │
│    Bug + solution + screenshots │
└─────────────────────────────────┘
```

## Cas d'usage spécifiques au projet chiropraxie-qcm-v2

### Validation des 10 thèmes daisyUI

```typescript
// Script de validation complète
const themes = [
  'toulouse',
  'nocturne',
  'clown',
  'azure',
  'forest',
  'sunset',
  'ocean',
  'medical',
  'lavande',
  'cupcake',
]

for (const theme of themes) {
  await browsermcp_browser_select_option({
    element: 'Theme selector',
    ref: 'theme-select',
    values: [theme],
  })
  await browsermcp_browser_wait({ time: 0.5 })
  const screenshot = await browsermcp_browser_screenshot()
  // Valider couleurs, contraste, lisibilité
}
```

### Test workflow import Quizlet

```typescript
// Tester import de questions
await browsermcp_browser_navigate({ url: 'http://localhost:5173/import' })
await browsermcp_browser_snapshot()

// Coller texte Quizlet
await browsermcp_browser_type({
  element: 'Import textarea',
  ref: 'import-textarea',
  text: 'Question 1\tRéponse 1\nQuestion 2\tRéponse 2',
  submit: false,
})

// Valider import
await browsermcp_browser_click({
  element: 'Import button',
  ref: 'btn-import',
})

await browsermcp_browser_wait({ time: 1 })
await browsermcp_browser_screenshot()

// Vérifier console logs (pas d'erreurs parsing)
const logs = await browsermcp_browser_get_console_logs()
```

### Test génération IA avec Ollama

```typescript
// Vérifier que l'IA génère bien des questions
await browsermcp_browser_navigate({ url: 'http://localhost:5173/generate' })
await browsermcp_browser_snapshot()

// Remplir prompt
await browsermcp_browser_type({
  element: 'Prompt input',
  ref: 'prompt-input',
  text: "Génère 3 questions sur l'anatomie vertébrale",
  submit: false,
})

// Lancer génération
await browsermcp_browser_click({
  element: 'Generate button',
  ref: 'btn-generate',
})

// Attendre réponse Ollama (peut être long)
await browsermcp_browser_wait({ time: 10 })

// Screenshot résultat
await browsermcp_browser_screenshot()

// Vérifier logs (pas d'erreur Ollama)
const logs = await browsermcp_browser_get_console_logs()
const ollamaErrors = logs.filter(log => log.level === 'error' && log.message.includes('ollama'))
```

## Limitations

- **Serveur dev requis** : Ne peut pas tester build production facilement
- **Pas de simulation réseau** : Offline mode difficile à tester
- **Refs volatiles** : Nécessite re-snapshot fréquent
- **Timing délicat** : Peut nécessiter ajustements de wait()
- **Pas de tests headless natifs** : Utiliser Playwright pour CI/CD

## Complémentarité avec Playwright

- **Browser MCP** : Tests manuels, validation visuelle, debugging interactif
- **Playwright** : Tests automatisés, CI/CD, regression testing, headless

Workflow recommandé :

1. Développement : Browser MCP pour validation rapide
2. Pre-commit : Playwright tests automatiques
3. CI/CD : Playwright full suite

## Références

- Configuration OpenCode: `.opencode/opencode.json`
- Documentation Browser MCP: https://github.com/executeautomation/browser-mcp
- Playwright (complémentaire): https://playwright.dev/
