import { html } from 'lit'
import {
  fixture,
  expect,
  assert,
  fixtureSync,
  elementUpdated,
} from '@open-wc/testing'

import { LuxembourgGeoportail } from '../../src/components/LuxembourgGeoportail'

describe('LuxembourgGeoportail', () => {
  let element: LuxembourgGeoportail
  beforeEach(async () => {
    element = await fixture(
      html`<luxembourg-geoportail></luxembourg-geoportail>`
    )
  })

  it('is defined', async () => {
    const el = document.createElement('luxembourg-geoportail')
    assert.instanceOf(el, LuxembourgGeoportail)
  })

  it('can instantiate the component', async () => {
    const el = await fixture('<luxembourg-geoportail></luxembourg-geoportail>')
    assert.instanceOf(el, LuxembourgGeoportail)
  })

  it('renders a h1', async () => {
    const el = fixtureSync('<luxembourg-geoportail></luxembourg-geoportail>')
    await elementUpdated(el)
    const h1 = el.querySelector('h1')
    expect(h1).to.exist
    expect(h1?.textContent).to.contain('Hello, Luxembourg Geoportail !')
  })
})
