import 'primeicons/primeicons.css'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initializeApp } from "firebase/app"
import PrimeVue from 'primevue/config'
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/nora'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice';

//Prime Vue components
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';
import AutoComplete from 'primevue/autocomplete';
import Card from 'primevue/card';
import InputMask from 'primevue/inputmask';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import RadioButton from 'primevue/radiobutton';
import Select from 'primevue/select';
import ConfirmDialog from 'primevue/confirmdialog';
import Tag from 'primevue/tag';
import Chart from 'primevue/chart';
import Chip from 'primevue/chip';
import DataView from 'primevue/dataview';
import Textarea from 'primevue/textarea';
import MultiSelect from 'primevue/multiselect';
import InputNumber from 'primevue/inputnumber';
import SelectButton from 'primevue/selectbutton';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import FileUpload from 'primevue/fileupload';
import Tooltip from 'primevue/tooltip';

import App from './App.vue'
import router from './router'

 const apiKey = import.meta.env.VITE_API_KEY_FIREBASE
const firebaseConfig = {
    apiKey: apiKey,
    authDomain: "crm-system-vue3-87dee.firebaseapp.com",
    projectId: "crm-system-vue3-87dee",
    storageBucket: "crm-system-vue3-87dee.firebasestorage.app",
    messagingSenderId: "703563282961",
    appId: "1:703563282961:web:f47185cc212612dbe50fb0"
  }
  initializeApp(firebaseConfig)

const app = createApp(App)

const MyPreset = definePreset(Aura, {
  semantic: {
      primary: {
          50: '{indigo.50}',
          100: '{indigo.100}',
          200: '{indigo.200}',
          300: '{indigo.300}',
          400: '{indigo.400}',
          500: '{indigo.500}',
          600: '{indigo.600}',
          700: '{indigo.700}',
          800: '{indigo.800}',
          900: '{indigo.900}',
          950: '{indigo.950}'
      }
  }
});

app.use(PrimeVue, {
  theme: {
      preset: MyPreset,
      options: {
          prefix: 'p',
          darkModeSelector: 'none',
          cssLayer:  {
            name: "primevue",
            order: "theme, base, primevue",
        },
      }
  }
});

app.use(createPinia())
app.use(router)
app.use(ToastService)
app.use(ConfirmationService);

app.component('app-menubar', Menubar)
app.component('app-button', Button)
app.component('app-inputtext', InputText)
app.component('app-message', Message)
app.component('app-floatlabel', FloatLabel)
app.component('app-autocomplete', AutoComplete)
app.component('app-card', Card)
app.component('app-inputmask', InputMask)
app.component('app-dialog', Dialog)
app.component('app-datatable', DataTable)
app.component('app-column', Column)
app.component('app-radiobutton', RadioButton)
app.component('app-select', Select)
app.component('app-confirmdialog', ConfirmDialog)
app.component('app-tag', Tag)
app.component('app-chart', Chart)
app.component('app-chip', Chip)
app.component('app-dataview', DataView)
app.component('app-textarea', Textarea)
app.component('app-multiselect', MultiSelect)
app.component('app-inputnumber', InputNumber)
app.component('app-selectbutton', SelectButton)
app.component('app-inputgroup', InputGroup)
app.component('app-inputgroupaddon', InputGroupAddon)
app.component('app-fileupload', FileUpload)

app.directive('tooltip', Tooltip);

app.mount('#app')