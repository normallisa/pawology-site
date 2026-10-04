/* =========================================================
   Простое хранилище состояния (без бэкенда)
   pet: "dog" | "cat"   lang: "ru" | "en"   answers: ответы квиза
   Можно задать через ссылку: ?pet=cat&lang=en (удобно для рекламы)
   ========================================================= */
(function () {
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const qs = new URLSearchParams(location.search);
  const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);

  const state = {
    pet: pick(qs.get("pet") || ls.get("paw.pet"), ["dog", "cat"], "dog"),
    lang: pick(qs.get("lang") || ls.get("paw.lang"), ["ru", "en"], "ru"),
    answers: {},
  };

  const listeners = [];

  window.Store = {
    get: () => state,
    set(patch) {
      const changed = Object.keys(patch).filter((k) => state[k] !== patch[k]);
      if (!changed.length) return;
      Object.assign(state, patch);
      if (changed.includes("pet")) ls.set("paw.pet", state.pet);
      if (changed.includes("lang")) ls.set("paw.lang", state.lang);
      listeners.forEach((fn) => fn(state, changed));
    },
    setAnswer(key, value) {
      state.answers[key] = value;
      listeners.forEach((fn) => fn(state, ["answers"]));
    },
    subscribe(fn) { listeners.push(fn); },
  };
})();
