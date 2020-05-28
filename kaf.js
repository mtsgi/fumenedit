/* eslint-disable no-new-func, eqeqeq, no-return-assign, no-new-object */
'use strict'

//    __        ___    _
//   / /_____ _/ _/   (_)__
//  /  '_/ _ `/ _/   / (_-<
// /_/\_\\_,_/_/(_)_/ /___/
//             |___/
// v0.1 (beta)
// MIT LICENSE (c) 2020 mtsgi

class Kaf {
  constructor (options) {
    this._elem_selector = options.elem
    this._elem = document.querySelector(options.elem)
    if (!this._elem) return Kaf.error('[Initialize] Element was not found.')

    this._factors = this._elem.querySelectorAll(Kaf.attrs.join(', '))
    this._styles = options.styles || new Object()

    this._dictionary = options.dictionary || { default: null }

    this._data = new Object()
    if (options.data) this._data = { ...Object.fromEntries(Object.entries(options.data).filter(d => typeof d[1] !== 'function')) }
    this._data.__locale = options.locale || 'default'
    for (const i in this._data) {
      Object.defineProperty(this, i, {
        get: () => this._data[i],
        set: value => {
          this._data[i] = value
          this.$induce(i)
        }
      })
    }

    this._data.__calc = options.calc || new Object()
    this._calc = new Object()
    for (const i in this._data.__calc) {
      if (typeof this._data.__calc[i] === 'object') {
        for (const c in this._data.__calc[i]) {
          Object.defineProperty(this._calc, c, {
            get: () => this._data.__calc[i][c].apply(this),
            set: () => Kaf.error('[Initialize] You can\'t assign a value to calc data.')
          })
        }
      }
    }

    this._events = { ...options.events }
    for (const i in this._events) {
      if (this[i]) Kaf.error(`[Initialize] The event name ${i} is already used. It can't be assigned.`)
      else this[i] = this._events[i]
    }

    this._nodenum = 0
    this._factors.forEach(el => {
      this._nodenum++
      if (el.hasAttribute('kit-e')) {
        el.getAttribute('kit-e').split(',').forEach(ev => {
          const ea = ev.trim().split(' ')
          el.addEventListener(ea[1] || 'click', () => {
            if (!this._events[ea[0]]) Kaf.error(`[Runtime] Event ${ea[0]} was not found.`, el)
            else this._events[ea[0]].apply(this)
          })
        })
      }
      if (el.hasAttribute('kit:assign')) {
        el.getAttribute('kit:assign').split(',').forEach(ae => {
          const at = ae.trim().split(' ')
          el.addEventListener('click', () => this[at[0]] = Kaf.eval(at[1]))
        })
      }
      if (el.hasAttribute('kit-html')) {
        el.innerHTML = Kaf.eval(el.getAttribute('kit-html'))
      }
      if (el.hasAttribute('kit:observe')) {
        el.innerHTML = this._data[el.getAttribute('kit:observe')]
      }
      if (el.hasAttribute('kit:bind')) {
        const binding = el.getAttribute('kit:bind')
        if (this[binding]) {
          el.value = this._data[binding]
        } else {
          Object.defineProperty(this, binding, {
            get: () => this._data[binding],
            set: value => {
              this._data[binding] = value
              this.$induce(binding)
            }
          })
        }
        if (el.type == 'checkbox') {
          this[binding] = el.checked
          el.addEventListener('change', () => this[binding] = el.checked)
        } else {
          this[binding] = el.value;
          ['keydown', 'keyup', 'keypress', 'change'].forEach(et => {
            el.addEventListener(et, () => this[binding] = el.value)
          })
        }
      }
      if (el.hasAttribute('kit:if')) {
        el.setAttribute('kaf-node-id', this._nodenum)
      }
      if (el.hasAttribute('kit-if')) {
        const _value = Kaf.eval(el.getAttribute('kit:if'))
        console.warn(_value)
      }
      if (el.hasAttribute('kit:for')) {
        if ('content' in document.createElement('template')) {
          el.setAttribute('kaf-node-id', this._nodenum)
          this._data[`__kaf_node_id_${this._nodenum}`] = el.innerHTML
          el.insertAdjacentHTML('afterend', `<kit-for kaf-node-id="${this._nodenum}"></kit-for>`)
        } else el.style.display = 'none'
        this.$induce(el.getAttribute('kit:for'))
      }
      if (el.hasAttribute('kit-i')) {
        el.setAttribute('kaf-node-id', this._nodenum)
        this._data[`__kaf_node_id_${this._nodenum}`] = el.innerHTML
      }
    })
    this.$locale(this._data.__locale)

    for (const i in this._styles) {
      if (typeof this._styles[i] === 'string') this._elem.style[i] = this._styles[i]
      else if (typeof this._styles[i] === 'object') Kaf.attachStyles(this._elem, i, this._styles[i])
    }
    if (this._events.$loaded) this._events.$loaded.apply(this)
  }

  $qs (...args) {
    const selector = args.join(', ')
    return selector ? this._elem.querySelectorAll(selector) : document.querySelectorAll(this._elem_selector)
  }

  $induce (key) {
    const _value = this._data[key]
    for (const elem of this.$qs(`[kit\\:observe=${key}]`)) {
      elem.innerHTML = _value
    }
    for (const elem of this.$qs(`[kit\\:value=${key}]`)) {
      elem.value = _value
    }
    for (const elem of this.$qs('[kit\\:if]')) {
      this.$switchIfElem(elem)
    }
    if (typeof _value === 'object') {
      for (const elem of this.$qs(`template[kit\\:for=${key}] + kit-for`)) {
        const _rep = this._data[`__kaf_node_id_${elem.getAttribute('kaf-node-id')}`]; let _result = ''
        for (const i in _value) {
          _result += _rep.replace(/{{\s*key\s*}}/g, i).replace(/{{\s*value\s*}}/g, _value[i])
        }
        elem.innerHTML = _result
      }
    }
    if (key == '__locale') this.$locale(_value)
    for (const calc in this._data.__calc[key]) {
      const calculated = this._calc[calc]
      for (const elem of this.$qs(`[kit\\:\\:observe=${calc}]`)) {
        elem.innerHTML = calculated
      }
      for (const elem of this.$qs(`[kit\\:\\:value=${calc}]`)) {
        elem.value = calculated
      }
    }
  }

  $switchIfElem (elem) {
    const compArr = elem.getAttribute('kit:if').split(/(===|!==|==|!=|\?\?|&&|\|\|)/)
    const target = Kaf.accessor(this._data, compArr[0].trim())
    let right = null
    if (compArr[2]) {
      try {
        right = Kaf.eval(compArr[2])
      } catch (error) {
        right = Kaf.accessor(this._data, compArr[2].trim())
      }
    }
    console.warn(target, right)
    let shouldDisp = false
    switch (compArr[1]) {
      case undefined:
        if (target) shouldDisp = true
        break
      case '==':
        if (target == right) shouldDisp = true
        break
      case '!=':
        if (target != right) shouldDisp = true
        break
      case '===':
        if (target === right) shouldDisp = true
        break
      case '!==':
        if (target !== right) shouldDisp = true
        break
      case '??':
        if (target !== undefined && target !== null) shouldDisp = true
        break
      case '&&':
        if (target && Kaf.accessor(this._data, compArr[2].trim())) shouldDisp = true
        break
      case '||':
        if (target || Kaf.accessor(this._data, compArr[2].trim())) shouldDisp = true
        break
    }
    if (shouldDisp) elem.style.display = 'block'
    else elem.style.display = 'none'
  }

  $locale (lang) {
    for (const el of this._elem.querySelectorAll('[kit-i]')) {
      if (this._dictionary[this._data.__locale]) {
        el.innerHTML = this._data[`__kaf_node_id_${el.getAttribute('kaf-node-id')}`].replace(/{{\s*([^\s]*)\s*}}/g, (match, target) => {
          return Kaf.accessor(this._dictionary[this._data.__locale], target) || Kaf.accessor(this._dictionary[this._data.__default_locale], target)
        })
      }
    }
  }

  static accessor (obj, acc) {
    const accessors = acc.split('.')
    if (!obj) return Kaf.error('[Accesor] Could not find accessing object.') || undefined
    else if (accessors[1]) return Kaf.accessor(obj[accessors[0]], accessors.slice(1).join('.'))
    else return obj[accessors[0]]
  }

  static error (...messages) {
    if (Kaf.debugging) {
      console.group('KAF Error')
      console.log('%cKAF Error', 'color: white; background: dodgerblue;border-radius: 4px; padding: 0 5px', (new Date()).toLocaleString())
      for (const message of messages) {
        console.warn(message)
      }
      console.groupEnd()
    }
    return false
  }

  static eval (expr) {
    return Function(`"use strict"; return(${expr})`)()
  }

  static attachStyles (parent = document, selector, object = {}) {
    try {
      const tlist = parent.querySelectorAll(selector)
      for (const d in object) {
        if (typeof object[d] === 'string') {
          for (const t of tlist) {
            t.style[d] = object[d]
          }
        } else if (typeof object[d] === 'object') {
          let _j = [selector, d].join(' ')
          if (d.indexOf('&') === 0) _j = [selector, d.substr(1)].join('')
          Kaf.attachStyles(parent, _j, object[d])
        }
      }
    } catch (error) {
      Kaf.error(`[styles] Invalid selector: ${selector}`)
    }
  }
}

Kaf.debugging = false

Kaf.attrs = [
  '[kit-ref]',
  '[kit-e]',
  '[kit\\:bind]',
  '[kit\\:observe]',
  '[kit\\:value]',
  '[kit\\:if]',
  '[kit\\:for]',
  '[kit\\:assign]',
  '[kit-i]',
  '[kit\\:\\:observe]'
]
