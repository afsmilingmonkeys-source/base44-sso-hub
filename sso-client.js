// sso-client.js — versión robusta con retry y logs
(function () {
  const SSO = {
    init(config) {
      this.config = config;
      this.attempts = 0;
      this.maxAttempts = 3;
      this.checkSession();
    },

    async checkSession() {
      if (this.attempts >= this.maxAttempts) {
        console.warn('[SSO] Máximo de intentos alcanzado. Sesión no detectada.');
        if (this.config.onLogout) this.config.onLogout();
        return;
      }

      this.attempts++;

      try {
        // Crear iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'sso-iframe';
        iframe.style.display = 'none';
        iframe.src = `${this.config.authDomain}/session.html`;
        document.body.appendChild(iframe);

        // Promesa para esperar respuesta
        const response = await new Promise((resolve) => {
          const handleMessage = (event) => {
            if (event.origin !== new URL(this.config.authDomain).origin) return;
            if (event.data.type === 'SSO_SESSION') {
              window.removeEventListener('message', handleMessage);
              document.body.removeChild(iframe);
              resolve(event.data.session);
            }
          };

          window.addEventListener('message', handleMessage);

          // Timeout de 2s
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            if (iframe.parentNode) document.body.removeChild(iframe);
            resolve(null);
          }, 2000);
        });

        // Procesar respuesta
        if (response) {
          console.log('[SSO] Sesión detectada:', response.user.email);
          if (this.config.onLogin) this.config.onLogin(response.user);
        } else {
          console.log('[SSO] No hay sesión activa. Intento #', this.attempts);
          if (this.config.onLogout) this.config.onLogout();
        }

      } catch (e) {
        console.error('[SSO] Error al verificar sesión:', e);
        if (this.config.onLogout) this.config.onLogout();
      }
    }
  };

  window.SSO = SSO;
})();
