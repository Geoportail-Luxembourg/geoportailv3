import { expect } from '@open-wc/testing'
import { Layer, MapContext } from '../../src/state/map/map.state.model'
import { MapSateListener } from '../../src/state/map/map.state.listeners'

const SAMPLE_LAYERS: Layer[] = [
  {
    id: 269,
    name: 'communes_labels',
    metadata: {
      is_queryable: true,
      metadata_id: '17c7d883-ff7f-4b48-a894-46bea40d2e49',
    },
    dimensions: {},
    type: 'WMS',
    layers: 'communes_labels',
    imageType: 'image/png',
    style: 'default',
  },
  {
    id: 302,
    name: 'communes',
    metadata: {
      is_queryable: true,
      metadata_id: 'de5373d6-340f-4203-a065-da7550a03cc4_2049',
    },
    dimensions: {},
    type: 'WMS',
    layers: 'communes',
    imageType: 'image/png',
    style: 'default',
  },
  {
    id: 346,
    name: 'cantons_labels',
    metadata: {
      is_queryable: true,
      metadata_id: '3af20a80-be4a-4819-a42b-18e49af799aa',
    },
    dimensions: {},
    type: 'WMS',
    layers: 'cantons_labels',
    imageType: 'image/png',
    style: 'default',
  },
]

const LAYER_2: Layer = {
  id: 51,
  name: 'layer 3',
  type: 'WMS',
  layers: 'layer_3',
  imageType: 'image/png',
}

const LAYER_3: Layer = {
  id: 51,
  name: 'layer 3',
  type: 'WMS',
  layers: 'layer_3',
  imageType: 'image/png',
}

const getEmptyContext = () => ({})

describe('context functions', () => {
  let oldContext: MapContext | null, newContext: MapContext

  describe('MapSateListener.getAddedLayers', () => {
    describe('layers array has not changed', () => {
      beforeEach(() => {
        oldContext = {
          layers: SAMPLE_LAYERS,
        }
        newContext = {
          layers: SAMPLE_LAYERS,
        }
      })
      it('returns empty array', () => {
        expect(MapSateListener.getAddedLayers(newContext, oldContext)).to.eql(
          []
        )
      })
    })
    describe('layers array changed', () => {
      beforeEach(() => {
        oldContext = {
          layers: SAMPLE_LAYERS,
        }
        newContext = {
          layers: [SAMPLE_LAYERS[1], LAYER_2, SAMPLE_LAYERS[0], LAYER_3],
        }
      })
      it('returns changed layers', () => {
        expect(MapSateListener.getAddedLayers(newContext, oldContext)).to.eql([
          { layer: LAYER_2, position: 1 },
          { layer: LAYER_3, position: 3 },
        ])
      })
    })
    describe('layers array not set in new context', () => {
      beforeEach(() => {
        oldContext = {
          layers: SAMPLE_LAYERS,
        }
        newContext = { layers: [] }
      })
      it('returns empty array', () => {
        expect(MapSateListener.getAddedLayers(newContext, oldContext)).to.eql(
          []
        )
      })
    })
    describe('layers array not set in old context', () => {
      beforeEach(() => {
        oldContext = getEmptyContext()
        newContext = {
          layers: SAMPLE_LAYERS,
        }
      })
      it('returns changed layers', () => {
        expect(MapSateListener.getAddedLayers(newContext, oldContext)).to.eql([
          { layer: SAMPLE_LAYERS[0], position: 0 },
          { layer: SAMPLE_LAYERS[1], position: 1 },
          { layer: SAMPLE_LAYERS[2], position: 2 },
        ])
      })
    })
    describe('old context is null', () => {
      beforeEach(() => {
        oldContext = null
        newContext = {
          layers: SAMPLE_LAYERS,
        }
      })
      it('returns changed layers', () => {
        expect(MapSateListener.getAddedLayers(newContext, oldContext)).to.eql([
          { layer: SAMPLE_LAYERS[0], position: 0 },
          { layer: SAMPLE_LAYERS[1], position: 1 },
          { layer: SAMPLE_LAYERS[2], position: 2 },
        ])
      })
    })
  })

  describe('MapSateListener.getRemovedLayers', () => {
    describe('layers array has not changed', () => {
      beforeEach(() => {
        oldContext = {
          layers: SAMPLE_LAYERS,
        }
        newContext = {
          layers: SAMPLE_LAYERS,
        }
      })
      it('returns empty array', () => {
        expect(MapSateListener.getRemovedLayers(newContext, oldContext)).to.eql(
          []
        )
      })
    })
    describe('layers array changed', () => {
      beforeEach(() => {
        oldContext = {
          layers: SAMPLE_LAYERS,
        }
        newContext = {
          layers: [SAMPLE_LAYERS[1], LAYER_2, SAMPLE_LAYERS[0], LAYER_2],
        }
      })
      it('returns removed layer', () => {
        expect(MapSateListener.getRemovedLayers(newContext, oldContext)).to.eql(
          [SAMPLE_LAYERS[2]]
        )
      })
    })
    describe('layers array empty in new context', () => {
      beforeEach(() => {
        oldContext = {
          layers: SAMPLE_LAYERS,
        }
        newContext = { layers: [] }
      })
      it('returns empty array', () => {
        expect(MapSateListener.getRemovedLayers(newContext, oldContext)).to.eql(
          SAMPLE_LAYERS
        )
      })
    })
    describe('layers array not set in new context', () => {
      beforeEach(() => {
        oldContext = {
          layers: SAMPLE_LAYERS,
        }
        newContext = getEmptyContext()
      })
      it('returns empty array', () => {
        expect(MapSateListener.getRemovedLayers(newContext, oldContext)).to.eql(
          []
        )
      })
    })
    describe('layers array not set in old context', () => {
      beforeEach(() => {
        oldContext = getEmptyContext()
        newContext = {
          layers: SAMPLE_LAYERS,
        }
      })
      it('returns empty array layers', () => {
        expect(MapSateListener.getRemovedLayers(newContext, oldContext)).to.eql(
          []
        )
      })
    })
    describe('old context is null', () => {
      beforeEach(() => {
        oldContext = null
        newContext = {
          layers: SAMPLE_LAYERS,
        }
      })
      it('returns empty array layers', () => {
        expect(MapSateListener.getRemovedLayers(newContext, oldContext)).to.eql(
          []
        )
      })
    })
  })
})
