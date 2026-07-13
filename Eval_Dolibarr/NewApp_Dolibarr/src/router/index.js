import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore }                   from '@/stores/auth'

import LoginView         from '@/views/backoffice/LoginView.vue'
import DashboardView     from '@/views/backoffice/DashboardView.vue'
import ImportView        from '@/views/backoffice/ImportView.vue'
import ResetView         from '@/views/backoffice/ResetView.vue'
import JoursFeriesView   from '@/views/backoffice/JoursFeriesView.vue'
import SwitchSpaceView   from '@/views/SwitchSpaceView.vue'
import FrontofficeHome   from '@/views/frontoffice/HomeView.vue'
import SalarieList       from '@/views/frontoffice/SalarieList.vue'
import SalariePay        from '@/views/frontoffice/SalariePay.vue'
import SalarieGenerate from '@/views/frontoffice/SalarieGenerate.vue'
import SalarieGenerateNew from '@/views/frontoffice/SalarieGenerateNew.vue'
import PaymentGenerate from '@/views/frontoffice/PaymentGenerate.vue'
import SalarieListAll  from '@/views/frontoffice/SalarieListAll.vue'
import SalarieDetail   from '@/views/frontoffice/SalarieDetail.vue'
import SalaireLignesList from '@/views/frontoffice/SalaireLignesList.vue'
import ResteAPayerMensuel from '@/views/frontoffice/ResteAPayerMensuel.vue'

const routes = [
  {
    path     : '/select-space',
    name     : 'select-space',
    component: SwitchSpaceView
  },
  {
    path     : '/frontoffice',
    name     : 'frontoffice-home',
    component: FrontofficeHome
  },
  {
    path     : '/frontoffice/salaries',
    name     : 'frontoffice-salaries',
    component: SalarieList
  },
  {
    path     : '/frontoffice/salaries/:id/pay',
    name     : 'frontoffice-salarie-pay',
    component: SalariePay
  },
  {
    path     : '/salaries',
    redirect : { name: 'frontoffice-salaries' }
  },
  {
    path    : '/salaries/:id/pay',
    redirect: to => ({ name: 'frontoffice-salarie-pay', params: to.params })
  },

  {
  path     : '/frontoffice/salaries/generate',
  name     : 'frontoffice-salaries-generate',
  component: SalarieGenerate
},

{
  path     : '/frontoffice/salaries/generate-monthly',
  name     : 'frontoffice-salaries-generate-monthly',
  component: SalarieGenerateNew
},
{
  path     : '/frontoffice/salaries/all',
  name     : 'frontoffice-salaries-all',
  component: SalarieListAll
},
{
  path     : '/frontoffice/salaries/history',
  name     : 'frontoffice-salaries-history',
  component: SalaireLignesList
},

{
  path     : '/frontoffice/payment/generate',
  name     : 'frontoffice-payment-generate',
  component: PaymentGenerate
},

{
  path     : '/frontoffice/salaries/reste-mensuel',
  name     : 'frontoffice-reste-mensuel',
  component: ResteAPayerMensuel
},

{
  path     : '/frontoffice/salaries/:id/detail',
  name     : 'frontoffice-salarie-detail',
  component: SalarieDetail
},

  {
    path     : '/login',
    name     : 'login',
    component: LoginView
  },
  {
    path     : '/backoffice',
    name     : 'dashboard',
    component: DashboardView,
    meta     : { requiresAuth: true }
  },
  {
    path     : '/backoffice/import',
    name     : 'backoffice-import',
    component: ImportView,
    meta     : { requiresAuth: true }
  },
  {
    path     : '/backoffice/reset',
    name     : 'backoffice-reset',
    component: ResetView,
    meta     : { requiresAuth: true }
  },
  {
    path     : '/backoffice/jours-feries',
    name     : 'backoffice-jours-feries',
    component: JoursFeriesView,
    meta     : { requiresAuth: true }
  },
  {
    path    : '/',
    redirect: { name: 'select-space' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth               = useAuthStore()
  const seenSpaceSelection = localStorage.getItem('seenSpaceSelection') === 'true'

  if (!seenSpaceSelection && to.name !== 'select-space') {
    return { name: 'select-space' }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export default router