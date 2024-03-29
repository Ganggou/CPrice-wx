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
    platforms: {},
    selectedTab: '',
    selectedTag: '',
    goods: {},
    goodsFlag: {},
    tasks: {},
    self: {},
    selectedGoodId: "",
    taskValue: null,
    showModalStatus: false,
    tmpIds: [],
    topNum: 0
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
    that.fetchTemplateids()
  },
  onShow: function() {
    this.fetchPlatforms()
    this.fetchGoods()
  },
  onShareAppMessage: function (res) {
    var name = '好价速报'
    return {
      title: name,
      path: '/pages/index/index',
      imageUrl: '/pages/imgs/share.png',
      success: function (res) {
        wx.showToast({
          title: '转发成功',
          icon: 'success'
        })
        // 转发成功
      },
      fail: function (res) {
        wx.showToast({
          title: '转发失败'
        })
        // 转发失败
      }
    }
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
  fetchPlatforms: function() {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'platforms',
      method: 'GET',
      success: function (res) {
        if (res.data.ok) {
          var platforms = res.data.data
          var firstId = Object.keys(platforms)[0]
          var firstPlatform = platforms[firstId]
          var tab, tag
          if (app.globalData.selectedTab !== '' && app.globalData.selectedTag !== '') {
            tab = app.globalData.selectedTab
            tag = app.globalData.selectedTag
          } else if (firstPlatform.upper_id != null) {
            tab = firstPlatform.upper_id
            tag = firstPlatform.id
          } else {
            tab = firstPlatform.id
            tag = firstPlatform.id
            var ids = Object.keys(platforms)
            for (var i = 0; i < ids.length; i++) {
              if (platforms[ids[i]].upper_id == firstPlatform.id) {
                tag = ids[i]
              }
            }
          }
          that.setData({
            platforms: platforms,
            selectedTab: tab,
            selectedTag: tag
          })
          app.globalData.selectedTab = tab
          app.globalData.selectedTag = tag
        }
      }
    })
  },
  fetchGoods: function() {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'goods/hash_by_p',
      method: 'GET',
      success: function (res) {
        if (res.data.ok) {
          var data = res.data.data
          var platforms = Object.keys(data)
          var tmp = {}
          var flag = {}
          var i, j, goods
          for (j = 0; j < platforms.length; j++) {
            goods = data[platforms[j]]
            for (i = 0; i < goods.length; i++) {
              goods[i].updated_at = util.formatTime(new Date(goods[i].updated_at))
              goods[i].price /= 100.0
              if (i % 10 == 9) {
                goods[i]['ads'] = true
              }
              tmp[goods[i].id] = goods[i]
            }
            if (i > 0) {
              flag[platforms[j]] = goods[i - 1].id
            }
          }
          that.setData({
            goods: tmp,
            goodsFlag: flag
          })
          that.fetchTasks()
        }
      }
    })
  },
  fetchTasks: function () {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'tasks',
      method: 'GET',
      header: {
        'content-type': 'application/json', // 默认值
        'Authorization': wx.getStorageSync('jwt')
      },
      success: function (res) {
        if (res.data.ok) {
          that.reloadTasks(res.data.data)
        }
      }
    })
  },
  fetchTemplateids: function () {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'fetchTemplateIds',
      method: 'GET',
      success: function (res) {
        if (res.data.ok) {
          that.setData({ tmpIds: res.data.ids })
        }
      }
    })
  },
  changeTab: function(e) {
    var platformId = e.currentTarget.dataset.id
    if (platformId == this.data.selectedTab) {
      return
    }
    var newTabId = platformId
    var ids = Object.keys(this.data.platforms)
    for (var i = 0; i < ids.length; i++) {
      if (this.data.platforms[ids[i]].upper_id == newTabId) {
        this.setData({
          selectedTab: newTabId,
          selectedTag: ids[i]
        })
        app.globalData.selectedTab = newTabId
        app.globalData.selectedTag = ids[i]
        return
      }
    }
    this.setData({
      selectedTab: newTabId,
      selectedTag: newTabId,
      topNum: 0
    })
    app.globalData.selectedTab = newTabId
    app.globalData.selectedTag = newTabId
  },
  changeTag: function (e) {
    wx.showLoading({
      title: '加载中',
    })
    this.setData({
      selectedTag: e.currentTarget.dataset.id,
      topNum: 0
    })
    app.globalData.selectedTag = e.currentTarget.dataset.id
    setTimeout(function () {
      wx.hideLoading()
    }, 500)
  },
  fetchMore: function () {
    var that = this
    if (!that.data.goodsFlag.hasOwnProperty(that.data.selectedTag)) {
      return
    }
    wx.showLoading({
      title: '加载中',
    })
    wx.request({
      url: app.globalData.rootUrl + 'goods/fetch',
      method: 'GET',
      data: {
        pid: that.data.selectedTag,
        id: that.data.goodsFlag[that.data.selectedTag]
      },
      success(res) {
        if (res.data.ok) {
          var goods = res.data.data
          var tmp = that.data.goods
          var flag = that.data.goodsFlag
          var i
          for (i = 0; i < goods.length; i++) {
            goods[i].updated_at = util.formatTime(new Date(goods[i].updated_at))
            goods[i].price /= 100.0
            if (i % 10 == 9) {
              goods[i]['ads'] = true
            }
            tmp[goods[i].id] = goods[i]
          }
          if (i > 0) {
            flag[that.data.selectedTag] = goods[i - 1].id
          } else {
            delete flag[that.data.selectedTag]
          }
          that.setData({
            goods: tmp,
            goodsFlag: flag
          })
          setTimeout(function () {
            wx.hideLoading()
          }, 200)
        }
      }
    })
  },
  reloadTasks: function (tasks) {
    var tmp = {}
    var goods = this.data.goods
    for (var i = 0; i < tasks.length; i++) {
      tasks[i].match_value /= 100.0
      tmp[tasks[i].good_id] = tasks[i]
      goods[tasks[i].good_id]['state'] = tasks[i].state 
    }
    this.setData({
      tasks: tmp,
      goods: goods
    })
  },
  subModal: function (e) {
    var that = this
    var goodId = e.currentTarget.dataset.id
    this.setData({
      selectedGoodId: goodId,
      taskValue: that.data.tasks[goodId] ? that.data.tasks[goodId].match_value : null
    })
    this.powerDrawer(e.currentTarget.dataset.statu)
  },
  onTaskInputChange: function (e) {
    this.setData({
      taskValue: e.detail.value
    })
  },
  cancel: function () {
    this.powerDrawer('close')
  },
  unsub: function () {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'tasks/sleep',
      method: 'POST',
      data: {
        id: that.data.selectedGoodId
      },
      header: {
        'content-type': 'application/json', // 默认值
        'Authorization': wx.getStorageSync('jwt')
      },
      success: function (res) {
        if (res.data.ok) {
          that.powerDrawer('close')
          that.reloadTasks(res.data.data)
        } else {
          wx.showToast({
            icon: 'none',
            duration: 1200,
            title: res.data.message
          })
        }
      }
    })
  },
  sub: function () {
    var that = this
    wx.requestSubscribeMessage({
      tmplIds: that.data.tmpIds,
      success(res) {
        for (var i = 0; i < that.data.tmpIds.length; i++) {
          if (res[that.data.tmpIds[i]] !== "accept") {
            return
          }
        }
        that.createTask()
      }
    })
  },
  copy: function(e) {
    var that = this
    wx.setClipboardData({
      data: that.data.platforms[e.currentTarget.dataset.platform].url + e.currentTarget.dataset.id,
      success: function (res) {
        console.info(res)
      }
    })
  },
  createTask: function() {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'tasks',
      method: 'POST',
      data: {
        good_id: that.data.selectedGoodId,
        match_value: that.data.taskValue * 100
      },
      header: {
        'content-type': 'application/json', // 默认值
        'Authorization': wx.getStorageSync('jwt')
      },
      success: function (res) {
        if (res.data.ok) {
          that.powerDrawer('close')
          that.reloadTasks(res.data.data)
        }
        wx.showToast({
          icon: 'none',
          duration: 1200,
          title: res.data.message
        })
      }
    })
  },
  showGood: function (e) {
    wx.navigateTo({
      url: '../good/good?id=' + e.currentTarget.dataset.id
    })
  },
  toSearch: function () {
    wx.navigateTo({
      url: '../search/search'
    })
  },
  powerDrawer: function (status) {
    var currentStatu = status;
    this.util(currentStatu)
  },
  util: function (currentStatu) {
    /* 动画部分 */
    // 第1步：创建动画实例 
    var animation = wx.createAnimation({
      duration: 200,  //动画时长
      timingFunction: "linear", //线性
      delay: 0  //0则不延迟
    });

    // 第2步：这个动画实例赋给当前的动画实例
    this.animation = animation;

    // 第3步：执行第一组动画
    animation.opacity(0).rotateX(-100).step();

    // 第4步：导出动画对象赋给数据对象储存
    this.setData({
      animationData: animation.export()
    })

    // 第5步：设置定时器到指定时候后，执行第二组动画
    setTimeout(function () {
      // 执行第二组动画
      animation.opacity(1).rotateX(0).step();
      // 给数据对象储存的第一组动画，更替为执行完第二组动画的动画对象
      this.setData({
        animationData: animation
      })

      //关闭
      if (currentStatu == "close") {
        this.setData(
          {
            showModalStatus: false
          }
        );
      }
    }.bind(this), 200)

    // 显示
    if (currentStatu == "open") {
      this.setData(
        {
          showModalStatus: true
        }
      );
    }
  }
})