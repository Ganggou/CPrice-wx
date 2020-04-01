//index.js
//获取应用实例
const app = getApp()
const qiniuUploader = require("../../utils/qiniuUploader")
const util = require('../../utils/util.js')

Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    goods: [],
    self: {}
  },
  onLoad: function() {
    var that = this
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse) {
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
    wx.login({
      success: function (res) {
        app.globalData.wx_code = res.code
        if (res.code) {
          wx.request({
            url: app.globalData.rootUrl + 'users/verifications/login_state',
            method: 'GET',
            header: {
              'content-type': 'application/json', // 默认值
              'Authorization': wx.getStorageSync('jwt')
            },
            success(res) {
              if (res.data.ok) {
                app.globalData.loginStatus = true
                app.globalData.self = res.data.self
              } else {
                wx.removeStorageSync('jwt')
                app.globalData.loginStatus = false
                that.tryLogin(0)
              }
            },
            fail() {
              wx.removeStorageSync('jwt')
              app.globalData.loginStatus = false
            }
          })
        }
      }
    })
  },
  onShow: function() {
    this.fetchGoods()
  },
  tryLogin: function (looptime) {
    if (looptime > 3) {
      return
    }
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'users/sign_in',
      method: 'POST',
      data: {
        wx_code: app.globalData.wx_code
      },
      success: function (res) {
        if (res.data.ok) {
          wx.setStorageSync('jwt', res.header.Authorization)
          app.globalData.loginStatus = true
          app.globalData.self = res.data.self
        } else {
          wx.login({
            success: function (res) {
              app.globalData.wx_code = res.code
              that.tryLogin(looptime + 1)
            }
          })
        }
      }
    })
  },
  fetchGoods: function() {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'data',
      method: 'GET',
      success: function (res) {
        if (res.data.ok) {
          var goods = res.data.data
          for (var i = 0; i < goods.length; i++) {
            goods[i].updated_at = util.formatTime(new Date(goods[i].updated_at))
          }
          that.setData({
            goods: goods
          })
        }
      }
    })
  }
})