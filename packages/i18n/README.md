# @nhy/i18n

Typed translations for server rendering and browser updates.

## SSR

Resolve the locale from each request instead of storing it globally. This keeps
concurrent requests isolated.

```astro
---
import { getLang, t } from "@nhy/i18n";

const locale = getLang(Astro.request);
---

<h1>{t("hero.tagline.2", locale)}</h1>
```

`getLang(request)` checks the `locale` cookie first, then `Accept-Language`, and
finally falls back to English. `createTranslator(locale)` can be used when a
page has many translations:

```ts
const translate = createTranslator(getLang(request));
translate("hero.tagline.2");
```

## Browser

Calling `getLang()` without an argument reads the browser cookie and language
preferences. `setLang(locale)` persists the locale, updates scalar
`data-i18n` elements, and notifies subscribers.

```ts
import { getLang, setLang, subscribeLocale, t } from "@nhy/i18n";

const unsubscribe = subscribeLocale(() => {
  console.log(t("hero.tagline.2", getLang()));
});

setLang("id");
unsubscribe();
```

`subscribeLocale` is framework-agnostic and can be connected to React's
`useSyncExternalStore`, Svelte stores, or another UI state mechanism.

## Array translations

Translation values may be strings or string arrays. The key determines the
return type, so no cast is required:

```ts
const title = t("hero.tagline.2", "en"); // string
const words = t("hero.rotating", "en"); // string[]
```

Array results are copied before being returned, so callers can safely modify
them without mutating the translation catalog. Array translations are not
applied to `data-i18n` elements; render them through the framework instead.
