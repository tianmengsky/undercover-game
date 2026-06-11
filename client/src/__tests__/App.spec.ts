import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import App from '../App.vue'

describe('App', () => {
  it('renders router-view', () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div>Home</div>' } }],
    })
    setActivePinia(createPinia())

    const wrapper = mount(App, {
      global: { plugins: [router] },
    })
    expect(wrapper.html()).toContain('Home')
  })
})
