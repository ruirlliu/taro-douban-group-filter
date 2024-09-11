import Taro from '@tarojs/taro'
// import { parse, HTMLElement } from 'node-html-parser/dist/umd/index.js'
import { parse, HTMLElement } from 'node-html-parser' // 这个最终没有被uglify压缩，因为不支持压缩es6，待后续taro更换压缩器后即可修复
import {platform} from './platform'
import {log} from './logger'


/**
 * 包含错误兜底和提示的Taro.request函数
 */
function request (param: Taro.request.Param, isShowError?) {

  // 兜底错误处理
  function fail (e) {
    Taro.hideLoading()
    if (isShowError) {
      // 对用户抛出友好一点的错误提示，而不是e.message
      Taro.showToast({ icon: 'none', mask: true, title: '操作可能太频繁，请稍后重试或尝试切换网络到4G／Wifi' })
    }
    throw new Error(e.message || e.errMsg) // errMsg是Taro抛出来的
  }

  return Taro.request(param).then(res => {
    if (res.statusCode !== 200) {
      throw new Error(`请求发生错误（statusCode为${res.statusCode}）`)
    } 
    return res
  }).catch(e => fail(e))
}

/**
 * 爬虫并返回解析后的dom
 * @param url 
 */
export function crawlToDom (url: string, auth: string, isShowError = true) {
  return request({
    url,
    header: {
      'content-type': 'text/html',
      'Cookie': auth,
    },
    // xhrFields:{withCredentials: true},
    credentials: 'include',
  }, isShowError).then((res: any) => {
    return parse(res.data) as HTMLElement
  })
}

/**
 * 批量爬虫
 * @param urlArr 请求url的数组
 * @param callback 每爬取一次都会回调一次接口
 * @param delay 默认间隔1000ms爬取一次
 */
export function crawlToDomOnBatch (urlArr: string[] = [], auth: string, callback: Function = () => {}, delay: number = 1000) {
  let i = 0
  let count = 0 // 因为网络延迟，接口不一定会按顺序完成请求，甚至有时候是并行的，所以不能够返回i给callback，而是依赖count来计算进度
  let timer

  const fn = () => {
    if (i >= urlArr.length) {
      clearInterval(timer)
      return
    }

    crawlToDom(urlArr[i++], auth)
      .then(root => callback(root, count++, () => clearInterval(timer)))
      .catch((e) => {
        clearInterval(timer)
        throw Error(e)
      })

  }

  fn() // 先自执行一遍
  timer = setInterval(fn, delay)
}

export const debounce = (callback, delay) => {
  let timer;
  return (...arg) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      callback(...arg)
    }, delay);
  }
}

export const showToast = (title: string, config?: Object) => {
  Taro.showToast({
    title,
    icon: 'none',
    duration: 3000,
    ...(config || {})
  })
}




export default {
  request, crawlToDom, crawlToDomOnBatch,
  debounce, showToast, 
  platform, log
}
