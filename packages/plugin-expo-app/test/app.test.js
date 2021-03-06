/* global describe, it, expect */

const proxyquire = require('proxyquire').noPreserveCache().noCallThru()
const Client = require('@bugsnag/core/client')

describe('plugin: expo app', () => {
  it('should should use revisionId if defined (all platforms)', done => {
    const VERSION = '1.0.0'
    const REVISION_ID = '1.0.0-r132432'
    const plugin = proxyquire('../', {
      'expo-constants': {
        default: {
          platform: {
          },
          manifest: { version: VERSION, revisionId: REVISION_ID }
        }
      },
      'react-native': {
        AppState: {
          addEventListener: () => {},
          currentState: 'active'
        }
      }
    })
    const c = new Client({ apiKey: 'api_key', plugins: [plugin] })

    c._setDelivery(client => ({
      sendEvent: (payload) => {
        const r = JSON.parse(JSON.stringify(payload))
        expect(r).toBeTruthy()
        expect(r.events[0].app.codeBundleId).toBe(REVISION_ID)
        done()
      }
    }))
    c.notify(new Error('flip'))
  })

  it('should should use versionCode if defined (android)', done => {
    const VERSION_CODE = '1.0'
    const plugin = proxyquire('../', {
      'expo-constants': {
        default: {
          platform: {
            android: { versionCode: VERSION_CODE }
          },
          manifest: { version: '1.0.0' },
          appOwnership: 'standalone'
        }
      },
      'react-native': {
        AppState: {
          addEventListener: () => {},
          currentState: 'active'
        }
      }
    })
    const c = new Client({ apiKey: 'api_key', plugins: [plugin] })

    c._setDelivery(client => ({
      sendEvent: (payload) => {
        const r = JSON.parse(JSON.stringify(payload))
        expect(r).toBeTruthy()
        expect(r.events[0].metaData.app.nativeVersionCode).toBe(VERSION_CODE)
        done()
      }
    }))
    c.notify(new Error('flip'))
  })

  it('should should use bundleVersion if defined (ios)', done => {
    const BUNDLE_VERSION = '1.0'
    const plugin = proxyquire('../', {
      'expo-constants': {
        default: {
          platform: {
            ios: { buildNumber: BUNDLE_VERSION }
          },
          manifest: { version: '1.0.0' },
          appOwnership: 'standalone'
        }
      },
      'react-native': {
        AppState: {
          addEventListener: () => {},
          currentState: 'active'
        }
      }
    })
    const c = new Client({ apiKey: 'api_key', plugins: [plugin] })

    c._setDelivery(client => ({
      sendEvent: (payload) => {
        const r = JSON.parse(JSON.stringify(payload))
        expect(r).toBeTruthy()
        expect(r.events[0].metaData.app.nativeBundleVersion).toBe(BUNDLE_VERSION)
        done()
      }
    }))
    c.notify(new Error('flip'))
  })

  it('detects whether the app is inForeground', done => {
    const AppState = {
      addEventListener: (name, fn) => {
        listener = fn
      },
      currentState: 'active'
    }
    let listener
    const plugin = proxyquire('../', {
      'expo-constants': {
        default: {
          platform: {},
          manifest: {}
        }
      },
      'react-native': { AppState }
    })
    const c = new Client({ apiKey: 'api_key', plugins: [plugin] })

    expect(typeof listener).toBe('function')
    const events = []
    c._setDelivery(client => ({
      sendEvent: (payload) => {
        const r = JSON.parse(JSON.stringify(payload))
        expect(r).toBeTruthy()
        events.push(r)
        if (events.length < 3) return
        expect(events[0].events[0].app.inForeground).toBe(true)
        expect(events[1].events[0].app.inForeground).toBe(false)
        expect(events[2].events[0].app.inForeground).toBe(true)
        done()
      }
    }))
    c.notify(new Error('flip'))
    setTimeout(() => {
      listener('inactive')
      AppState.currentState = 'inactive'
      c.notify(new Error('flop'))
      setTimeout(() => {
        listener('active')
        AppState.currentState = 'active'
        c.notify(new Error('flooop'))
      }, 20)
    }, 20)
  })

  it('includes duration in event.app', done => {
    const start = Date.now()

    const plugin = proxyquire('../', {
      'expo-constants': {
        default: {
          platform: {},
          manifest: {}
        }
      },
      'react-native': {
        AppState: {
          addEventListener: (name, fn) => {},
          currentState: 'active'
        }
      }
    })

    const client = new Client({ apiKey: 'api_key', plugins: [plugin] })

    // Delay sending the notification by this many milliseconds to ensure
    // 'duration' will always have a useful value
    const delayMs = 10

    client._setDelivery(client => ({
      sendEvent: (payload) => {
        // The maximum number of milliseconds 'duration' should be
        const maximum = Date.now() - start

        expect(payload.events[0].app.duration).toBeGreaterThanOrEqual(delayMs)
        expect(payload.events[0].app.duration).toBeLessThanOrEqual(maximum)

        done()
      },
      sendSession: () => {}
    }))

    setTimeout(() => client.notify(new Error('flooopy doo')), delayMs)
  })
})
