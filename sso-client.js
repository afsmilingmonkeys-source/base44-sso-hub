// sso-client.js — cliente ligero de SSO para Base44
(function () {
  const SSO = {
    init(config) {
      this.config = config;
      this.checkSession();
      this.listenForChanges();
    },

    async checkSession() {
      try {
        // Crea un iframe invisible para acceder al localStorage del dominio de auth
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `${this.config.authDomain}/session.html`;
        document.body.appendChild(iframe);

        // Espera a que el iframe cargue y nos envíe el estado
        window.addEventListener('message', (event) => {
          if (event.origin !== new URL(this.config.authDomain).origin) return;

          if (event.data.type === 'SSO_SESSION') {
            if (event.data.session) {
              // ✅ Sesión activa
              const user = event.data.session.user;
              if (this.config.onLogin) this.config.onLogin(user);
            } else {
              // ❌ Sesión inactiva
              if (this.config.onLogout) this.config.onLogout();
            }
            document.body.removeChild(iframe);
          }
        });

        // Timeout de seguridad
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
            if (this.config.onLogout) this.config.onLogout();
          }
        }, 3000);
      } catch (e) {
        console.warn('[SSO] Error checking session:', e);
        if (this.config.onLogout) this.config.onLogout();
      }
    },

    listenForChanges() {
      // Detecta login/logout desde otras pestañas (del mismo origen auth)
      const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('base44-sso') : null;
      if (bc) {
        bc.onmessage = (event) => {
          if (event.data === 'login') this.checkSession();
          if (event.data === 'logout') {
            if (this.config.onLogout) this.config.onLogout();
          }
        };
      }

      // Fallback: escuchar cambios en localStorage (solo si estamos en el mismo dominio auth)
      window.addEventListener('storage', (e) => {
        if (e.key === 'base44_sso_session' && e.newValue === null) {
          if (this.config.onLogout) this.config.onLogout();
        }
      });
    }
  };

  // Exponer globalmente
  window.SSO = SSO;
})();
