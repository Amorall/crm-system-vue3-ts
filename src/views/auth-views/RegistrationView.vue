<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { RouterLink, useRouter } from 'vue-router';

import Loader from '../../components/loader.vue';

const authStore = useAuthStore();
const router = useRouter();

const email = ref<string>('');
const password = ref<string>('');
const emailTouched = ref<boolean>(false);
const passwordTouched = ref<boolean>(false);
const showPassword = ref<boolean>(false);
const suggestions = ref<string[]>([]);
const showEmailIcon = ref<boolean>(false);
const showPasswordIcon = ref<boolean>(false);

const emailDomains: string[] = [
  'gmail.com', 'mail.ru', 'yandex.ru', 'outlook.com', 'yahoo.com',
  'hotmail.com', 'icloud.com', 'aol.com', 'zoho.com', 'protonmail.com'
];

const isEmailFilled = computed(() => email.value.length > 0);
const isPasswordFilled = computed(() => password.value.length > 0);

const validateEmail = (value: string): string | true => {
  if (!value) return 'Email обязателен для заполнения';
  if (value.length > 64) return 'Email не может превышать 64 символа';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Введите корректный email';
  return true;
};

const validatePassword = (value: string): string | true => {
  if (!value) return 'Пароль обязателен для заполнения';
  if (value.length < 6) return 'Пароль должен содержать не менее 6 символов';
  if (value.length > 32) return 'Пароль не может превышать 32 символа';
  return true;
};

const emailError = computed<string | null>(() => {
  if (!emailTouched.value) return null;
  const validation = validateEmail(email.value);
  return validation === true ? null : validation;
});

const passwordError = computed<string | null>(() => {
  if (!passwordTouched.value) return null;
  const validation = validatePassword(password.value);
  return validation === true ? null : validation;
});

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const isEmailInvalid = computed(() => emailTouched.value && emailError.value !== null);
const isPasswordInvalid = computed(() => passwordTouched.value && passwordError.value !== null);

const isFormValid = computed(() => {
  return validateEmail(email.value) === true && validatePassword(password.value) === true;
});

const search = (event: { query: string }) => {
  const query = event.query;
  const atIndex = email.value.lastIndexOf('@');

  if (atIndex === -1) {
    suggestions.value = emailDomains.map(domain => `${query}@${domain}`);
  } else {
    const base = email.value.substring(0, atIndex);
    const domainQuery = email.value.substring(atIndex + 1);
    suggestions.value = emailDomains
      .filter(domain => domain.startsWith(domainQuery))
      .map(domain => `${base}@${domain}`);
  }
};

const signup = async () => {
  emailTouched.value = true;
  passwordTouched.value = true;

  if (!isFormValid.value) {
    return;
  }

  try {
    await authStore.auth({
      email: email.value,
      password: password.value
    }, 'signup');

    if (!authStore.error) {
      router.push('/statistics');
    }
  } catch (error) {
    console.error("Ошибка регистрации:", error);
  }
};
</script>

<template>
  <div class="w-screen min-h-[calc(100vh-56px)] overflow-auto bg-gray-100 flex flex-col items-center justify-center">
    <app-message class="mb-4 w-full max-w-md" v-if="authStore.error" severity="error" closable
      @close="authStore.error = ''">{{ authStore.error }}</app-message>

    <div class="w-full max-w-md">
      <div class="bg-white rounded-lg shadow-md p-8">
        <h2 class="text-2xl font-bold text-center mb-6">Регистрация в системе</h2>

        <form class="space-y-4" @submit.prevent="signup">

          <div class="flex flex-col gap-2">
            <app-floatlabel variant="on">
              <div class="relative">
                <app-autocomplete v-model="email" inputId="email" :suggestions="suggestions" @complete="search"
                  @focus="showEmailIcon = true" @blur="showEmailIcon = false; emailTouched = true"
                  :invalid="isEmailInvalid" class="w-full" inputClass="w-full h-[3rem] pl-10" />
                <i v-show="isEmailFilled || showEmailIcon"
                  class="pi pi-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <label for="email">E-mail</label>
              </div>
            </app-floatlabel>
            <small v-if="isEmailInvalid" class="text-red-500 text-sm">{{ emailError }}</small>
          </div>

          <div class="flex flex-col gap-2">
            <app-floatlabel variant="on">
              <div class="relative">
                <app-inputtext :type="showPassword ? 'text' : 'password'" id="password" v-model="password"
                  @focus="showPasswordIcon = true" @blur="showPasswordIcon = false; passwordTouched = true"
                  :invalid="isPasswordInvalid" class="w-full h-[3rem] pl-10" autocomplete="current-password"/>
                <i v-show="isPasswordFilled || showPasswordIcon"
                  class="pi pi-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <button type="button" @click="togglePasswordVisibility"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                </button>
                <label for="password">Пароль</label>
              </div>
            </app-floatlabel>
            <small v-if="isPasswordInvalid" class="text-red-500 text-sm">{{ passwordError }}</small>
          </div>
          <Loader v-if="authStore.loader" class="flex flex-col items-center justify-center" />
          <app-button v-else type="submit" label="Зарегистрироваться" class="w-full mt-6 h-[3rem]" />
        </form>
        <div class="mt-6 text-center">
          <span class="text-sm text-gray-600">
            Уже есть аккаунт?
            <RouterLink to="/login" class="text-blue-600 hover:text-blue-500 cursor-pointer font-medium">
              Войти
            </RouterLink>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.p-message {
  position: relative;
  margin-bottom: 1rem;
  z-index: 10;
}
</style>