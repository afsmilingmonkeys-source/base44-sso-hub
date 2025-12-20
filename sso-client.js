// sso-client.js — versión final: usa localStorage directo + BroadcastChannel
(function () {
  const SSO = {
    init(config) {
      this.config = config;
      this.checkSession();
      this.listenForChanges();
    },

    checkSession() {
      // Intentar leer directamente desde localStorage (si estamos en el mismo dominio)
      try {
        const sessionStr = localStorage.getItem('base44_sso_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (this.config.onLogin) this.config.onLogin(session.user);
          return;
        }
      } catch (e) {
        console.warn('[SSO] No se pudo leer localStorage:', e);
      }

      // Si no hay localStorage, intentar con iframe (fallback)
      this.checkViaIframe();
    },

    checkViaIframe() {
      const iframe = document.createElement('iframe');
      iframe.id = 'sso-iframe';
      iframe.style.display = 'none';
      iframe.src = `${this.config.authDomain}/session.html`;
      document.body.appendChild(iframe);

      const handleMessage = (event) => {
        if (event.origin !== new URL(this.config.authDomain).origin) return;
        if (event.data.type === 'SSO_SESSION') {
          window.removeEventListener('message', handleMessage);
          document.body.removeChild(iframe);
          if (event.data.session) {
            if (this.config.onLogin) this.config.onLogin(event.data.session.user);
          } else {
            if (this.config.onLogout) this.config.onLogout();
          }
        }
      };

      window.addEventListener('message', handleMessage);

      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (iframe.parentNode) document.body.removeChild(iframe);
        if (this.config.onLogout) this.config.onLogout();
      }, 2000);
    },

    listenForChanges() {
      // Escuchar cambios en localStorage (mismo dominio)
      window.addEventListener('storage', (e) => {
        if (e.key === 'base44_sso_session') {
          if (e.newValue === null) {
            if (this.config.onLogout) this.config.onLogout();
          } else {
            try {
              const user = JSON.parse(e.newValue).user;
              if (this.config.onLogin) this.config.onLogin(user);
            } catch (err) {
              if (this.config.onLogout) this.config.onLogout();
            }
          }
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
