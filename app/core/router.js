/**
 * Isaacs and Partners
 * Client-side Application Router
 *
 * Lightweight History API router.
 */

import { eventBus } from "./events.js";

class Router {
  constructor() {
    this.routes = new Map();
    this.started = false;
    this.currentRoute = null;
    this.notFoundHandler = null;

    this.handlePopState =
      this.handlePopState.bind(this);
    this.handleClick =
      this.handleClick.bind(this);
  }

  initialise() {
    return this;
  }

  register(path, handler, options = {}) {
    if (
      typeof path !== "string" ||
      path.trim() === ""
    ) {
      throw new TypeError(
        "Route path must be a non-empty string."
      );
    }

    if (typeof handler !== "function") {
      throw new TypeError(
        "Route handler must be a function."
      );
    }

    const normalisedPath =
      this._normalisePath(path);

    this.routes.set(normalisedPath, {
      handler,
      protected: Boolean(options.protected),
      meta: options.meta || {},
    });

    return this;
  }

  unregister(path) {
    return this.routes.delete(
      this._normalisePath(path)
    );
  }

  setNotFoundHandler(handler) {
    if (
      handler !== null &&
      typeof handler !== "function"
    ) {
      throw new TypeError(
        "Not-found handler must be a function or null."
      );
    }

    this.notFoundHandler = handler;

    return this;
  }

  async start() {
    if (this.started) {
      return this;
    }

    if (typeof window === "undefined") {
      return this;
    }

    window.addEventListener(
      "popstate",
      this.handlePopState
    );

    document.addEventListener(
      "click",
      this.handleClick
    );

    this.started = true;

    await this.resolve(
      window.location.pathname +
        window.location.search +
        window.location.hash,
      {
        replace: true,
        initial: true,
      }
    );

    return this;
  }

  async stop() {
    if (!this.started) {
      return;
    }

    if (typeof window !== "undefined") {
      window.removeEventListener(
        "popstate",
        this.handlePopState
      );

      document.removeEventListener(
        "click",
        this.handleClick
      );
    }

    this.started = false;
  }

  async navigate(
    path,
    {
      replace = false,
      state = {},
    } = {}
  ) {
    if (typeof window === "undefined") {
      return this.resolve(path);
    }

    const target =
      this._normaliseUrl(path);

    if (replace) {
      window.history.replaceState(
        state,
        "",
        target
      );
    } else {
      window.history.pushState(
        state,
        "",
        target
      );
    }

    return this.resolve(target, {
      state,
      replace,
    });
  }

  back() {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  }

  forward() {
    if (typeof window !== "undefined") {
      window.history.forward();
    }
  }

  async resolve(path, context = {}) {
    const url =
      this._parseUrl(path);

    const match =
      this._matchRoute(url.pathname);

    if (!match) {
      if (this.notFoundHandler) {
        const result =
          await this.notFoundHandler({
            path: url.pathname,
            query: url.searchParams,
            ...context,
          });

        this._setCurrentRoute(
          url.pathname,
          null,
          context
        );

        return result;
      }

      this._setCurrentRoute(
        url.pathname,
        null,
        context
      );

      return null;
    }

    const route =
      match.route;

    this._setCurrentRoute(
      url.pathname,
      route,
      context
    );

    eventBus.emit("router:beforeNavigate", {
      path: url.pathname,
      route,
      params: match.params,
      query: url.searchParams,
    });

    try {
      const result =
        await route.handler({
          path: url.pathname,
          params: match.params,
          query: url.searchParams,
          meta: route.meta,
          protected: route.protected,
          ...context,
        });

      eventBus.emit("router:navigated", {
        path: url.pathname,
        route,
        params: match.params,
        result,
      });

      return result;
    } catch (error) {
      eventBus.emit("router:error", {
        path: url.pathname,
        route,
        error,
      });

      throw error;
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  getRoutes() {
    return [...this.routes.entries()];
  }

  handlePopState(event) {
    if (typeof window === "undefined") {
      return;
    }

    this.resolve(
      window.location.pathname +
        window.location.search +
        window.location.hash,
      {
        state: event.state,
      }
    ).catch((error) => {
      console.error(
        "[Router] Navigation failed:",
        error
      );
    });
  }

  handleClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link =
      event.target.closest("a");

    if (!link) {
      return;
    }

    const href =
      link.getAttribute("href");

    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      return;
    }

    if (link.target === "_blank") {
      return;
    }

    let url;

    try {
      url = new URL(
        href,
        window.location.origin
      );
    } catch {
      return;
    }

    if (
      url.origin !== window.location.origin
    ) {
      return;
    }

    event.preventDefault();

    this.navigate(
      url.pathname +
        url.search +
        url.hash
    ).catch((error) => {
      console.error(
        "[Router] Link navigation failed:",
        error
      );
    });
  }

  _matchRoute(pathname) {
    const direct =
      this.routes.get(
        this._normalisePath(pathname)
      );

    if (direct) {
      return {
        route: direct,
        params: {},
      };
    }

    for (const [routePath, route] of this.routes) {
      const match =
        this._matchPattern(
          routePath,
          pathname
        );

      if (match) {
        return {
          route,
          params: match,
        };
      }
    }

    return null;
  }

  _matchPattern(pattern, pathname) {
    const patternParts =
      this._normalisePath(pattern)
        .split("/")
        .filter(Boolean);

    const pathParts =
      this._normalisePath(pathname)
        .split("/")
        .filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};

    for (
      let index = 0;
      index < patternParts.length;
      index += 1
    ) {
      const patternPart =
        patternParts[index];

      const pathPart =
        pathParts[index];

      if (patternPart.startsWith(":")) {
        params[
          patternPart.slice(1)
        ] = decodeURIComponent(pathPart);
        continue;
      }

      if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }

  _setCurrentRoute(
    pathname,
    route,
    context
  ) {
    this.currentRoute = {
      pathname,
      route,
      timestamp: new Date().toISOString(),
      ...context,
    };
  }

  _normalisePath(path) {
    if (!path || path === "/") {
      return "/";
    }

    const clean =
      path
        .split("?")[0]
        .split("#")[0]
        .replace(/\/+/g, "/");

    return clean.endsWith("/")
      ? clean.slice(0, -1)
      : clean;
  }

  _normaliseUrl(path) {
    const url =
      new URL(
        path,
        window.location.origin
      );

    return (
      url.pathname +
      url.search +
      url.hash
    );
  }

  _parseUrl(path) {
    return new URL(
      path,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost"
    );
  }
}

export const router = new Router();

export default router;
