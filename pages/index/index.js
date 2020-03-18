//index.js
//获取应用实例
const app = getApp()
const qiniuUploader = require("../../utils/qiniuUploader")

Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    goods: [{ id: 1, logo: 'https://images-na.ssl-images-amazon.com/images/I/51ZIQxjxTxL._SS160_.jpg', name: '健身环', price: 277.99, description: 'Arrives between Mar. 26 - April 3' }, { id: 2, logo: 'https://images-na.ssl-images-amazon.com/images/I/41BN3S9T1ZL._SS160_.jpg', name: '动森', price: 464.44, description: 'Arrives between March 24-26.'}],
    self: {}
  },
  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad: function() {
    var that = this
    var role = wx.getStorageSync('role')
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
    if (wx.openBluetoothAdapter) {
      wx.openBluetoothAdapter()
    } else {
      // 如果希望用户在最新版本的客户端上体验您的小程序，可以这样子提示
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。'
      })
    }
    wx.login({
      success: function (res) {
        app.globalData.wx_code = res.code
        if (res.code) {
          wx.request({
            url: app.globalData.rootUrl + role + '/verifications/login_state',
            method: 'GET',
            header: {
              'content-type': 'application/json', // 默认值
              'Authorization': wx.getStorageSync('jwt')
            },
            success(res) {
              if (res.data.ok) {
                app.globalData.loginStatus = true
                app.globalData.self = res.data.self
                that.loadData()
              } else {
                wx.removeStorageSync('jwt')
                app.globalData.loginStatus = false
                if (role == 'users') {
                  var tryTime = 3
                  while (tryTime > 0) {
                    if (that.tryLogin()) {
                      break;
                    }
                    tryTime -= 1
                  }
                } else {
                  wx.navigateTo({
                    url: '/pages/merLogin/merLogin',
                  })
                }
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
  },
  tryLogin: function () {
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
          that.loadData()
          return true
        } else {
          wx.login({
            success: function (res) {
              app.globalData.wx_code = res.code
            }
          })
        }
      }
    })
    return false
  }

})