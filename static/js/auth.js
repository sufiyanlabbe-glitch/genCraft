/**
 * CreatorAI – Authentication Page Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // Login Form Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const submitBtn = document.getElementById('login-submit-btn');
            const errorAlert = document.getElementById('auth-error-alert');

            if (errorAlert) errorAlert.classList.add('hidden');

            if (!email || !password) {
                CreatorAI.toast('Please enter both email and password.', 'warning');
                return;
            }

            const origContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Signing In...';

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    CreatorAI.toast('Welcome back! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 600);
                } else {
                    if (errorAlert) {
                        errorAlert.textContent = data.error || 'Login failed.';
                        errorAlert.classList.remove('hidden');
                    } else {
                        CreatorAI.toast(data.error || 'Login failed.', 'error');
                    }
                }
            } catch (err) {
                CreatorAI.toast('Connection error. Please verify the server is running.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origContent;
            }
        });
    }

    // Register Form Handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;
            const submitBtn = document.getElementById('register-submit-btn');
            const errorAlert = document.getElementById('auth-error-alert');

            if (errorAlert) errorAlert.classList.add('hidden');

            if (!name || !email || !password) {
                CreatorAI.toast('Please fill in all required fields.', 'warning');
                return;
            }

            if (password !== confirmPassword) {
                if (errorAlert) {
                    errorAlert.textContent = 'Passwords do not match.';
                    errorAlert.classList.remove('hidden');
                } else {
                    CreatorAI.toast('Passwords do not match.', 'error');
                }
                return;
            }

            if (password.length < 6) {
                CreatorAI.toast('Password must be at least 6 characters long.', 'warning');
                return;
            }

            const origContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Creating Account...';

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    CreatorAI.toast('Account registered! Taking you to the studio...', 'success');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 800);
                } else {
                    if (errorAlert) {
                        errorAlert.textContent = data.error || 'Registration failed.';
                        errorAlert.classList.remove('hidden');
                    } else {
                        CreatorAI.toast(data.error || 'Registration failed.', 'error');
                    }
                }
            } catch (err) {
                CreatorAI.toast('Network error during registration.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origContent;
            }
        });
    }
});

