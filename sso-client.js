// sso-client.js — versión final: usa cookies directamente
(function () {
  const SSO = {
    init(config) {
      this.config = config;
      this.checkSession();
      this.listenForChanges();
    },

    checkSession() {
      // Leer sesión de COOKIE
      const session = this.getCookie('base44_sso_session');
      if (session) {
        if (this.config.onLogin) this.config.onLogin(session.user);
      } else {
        if (this.config.onLogout) this.config.onLogout();
      }
    },

    getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const raw = parts.pop().split(';').shift();
        try {
          const decoded = decodeURIComponent(atob(raw));
          return JSON.parse(decoded);
        } catch (e) {
          return null;
        }
      }
      return null;
    },

    listenForChanges() {
      // Escuchar cambios en localStorage (fallback)
      window.addEventListener('storage', (e) => {
        if (e.key === 'base44_sso_session') {
          this.checkSession();
        }
      });

      // Escuchar mensajes de BroadcastChannel (opcional)
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('base44-sso');
        bc.onmessage = (event) => {
          if (event.data === 'login') this.checkSession();
          if (event.data === 'logout') {
            if (this.config.onLogout) this.config.onLogout();
          }
        };
      }
    }
  };

  window.SSO = SSO;
})();
