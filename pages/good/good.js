const app = getApp()
const util = require('../../utils/util.js')
var wxCharts = require('../../utils/wxcharts.js');
var lineChart = null;
Page({
  data: {
    logs: [],
    good: {},
    records: [],
    goodId: '',
    toload: false
  },
  onLoad: function (options) {
    this.setData({ goodId: options.id })
    this.fetchGood(options.id)
    this.setData({ toload: true })
  },
  onShow: function () {
    if (this.data.toload) {
      this.fetchGood(this.data.goodId)
    }
  },
  onShareAppMessage: function (res) {
    var name = '好价速报'
    return {
      title: name,
      path: '/pages/good/good?id=' + this.data.goodId,
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
  fetchGood: function(gId) {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'goods/detail',
      method: 'GET',
      data: {
        id: that.data.goodId || gId
      },
      success(res) {
        if (res.data.ok) {
          var good = res.data.good
          var records = res.data.records
          good.updated_at = util.formatTime(new Date(good.updated_at))
          good.price /= 100.0
          that.setData({
            good: good,
            records: records
          })
          if (records.length > 0) {
            that.loadChart(good, records)
          }
        }
      }
    })
  },
  loadChart: function(good, records) {
    var that = this
    var windowWidth = 320;
    try {
      var res = wx.getSystemInfoSync();
      windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    var simulationData = this.createSimulationData(records);
    lineChart = new wxCharts({
      canvasId: 'lineCanvas',
      type: 'line',
      categories: simulationData.categories,
      animation: false,
      // background: '#f5f5f5',
      series: [{
        name: '价格',
        data: simulationData.data,
        format: function (val, name) {
          return good.currency + val.toFixed(2);
        }
      }],
      xAxis: {
        disableGrid: true,
        title: '时间'
      },
      yAxis: {
        title: '价格 (' + good.currency + ')',
        format: function (val) {
          return val.toFixed(2);
        },
        min: 0
      },
      width: windowWidth,
      height: 200,
      dataLabel: false,
      dataPointShape: true,
      extra: {
        lineStyle: 'curve'
      }
    })
  },
  touchHandler: function (e) {
    var that = this
    lineChart.showToolTip(e, {
      // background: '#7cb5ec',
      format: function (item, category) {
        return util.formatTime(new Date(that.data.records[category].created_at)) + ' ' + item.name + ':' + item.data
      }
    });
  },
  createSimulationData: function (records) {
    var categories = [];
    var data = [];
    for (var i = 0; i < records.length ; i++) {
      categories.push(i);
      data.push(records[i].price / 100.0);
    }
    return {
      categories: categories,
      data: data
    }
  },
})