import React, { Component } from "react";
import { fabric } from "fabric";
import addEventListener from "rc-util/lib/Dom/addEventListener";
import { canvasStore } from "@/redux/CanvasStore";
import { paintOnCanvas, getReducerState } from "@/redux/CanvasRedux";
import { emitter } from "@/component/Emitter";
import { assetManager } from "@/component/AssetManager";
import { connect } from "react-redux";

const mapStateToProps = state => {
  return {
    ...getReducerState(state.canvasReducer, ['drawInfo', 'source_image', 'result_image', 'userToken', 'canvasDomPixData',])
  };
};

const mapDispatchToProps = dispatch => {
  return {
    addCanvasObject: obj => {
      dispatch(paintOnCanvas("ADD_CANVAS_OBJECT", obj));
    },
    addCanvasDom: obj => {
      dispatch(paintOnCanvas("ADD_CANVAS_DOM", obj));
    },
    updateCanvasDomPixdata: data => {
      dispatch(
        paintOnCanvas("UPDATE_CANVASDOMPIXDATA", { canvasDomPixData: data })
      );
    },
    updateCanvasDrawInfo: obj => {
      dispatch(
        paintOnCanvas("UPDATE_CANVAS_DRAWINFO", obj)
      )
    }
  };
};

class Canvas extends Component {
  constructor(props) {
    super(props);

    this.state = {
      canvasContentStyle: {},
      resultLoading: false,
      isMoving: false
    };

    this.drawPixData = {};
    this.tempObj = {};
  }

  componentDidMount() {
    let oCanvasLeft = document.querySelector(".canvasLeft");
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.selectable = false;
    this.canvas = new fabric.Canvas("canvas", {
      isDrawingMode: true,
      selection: false,
      selectable:false,
      width: oCanvasLeft.offsetWidth,
      height: oCanvasLeft.offsetHeight,
      backgroundColor: "rgba(241, 243, 247, 1)"
    });

    this.canvasResult = new fabric.Canvas("canvasResult", {
      selection: false,
      selectable:false,
      width: oCanvasLeft.offsetWidth,
      height: oCanvasLeft.offsetHeight,
      backgroundColor: "rgba(241, 243, 247, 1)",
      defaultCursor: "move"
    });

    this.replaceImageEmitter = emitter.addListener("resetImage", () => {
      this.canvas.clear();
      this.canvasResult.clear();
      this.drawPixData = {};

      this.setState({
        canvasContentStyle: {}
      });

      this.canvasInit();
      this.canvasResultInit();
      this.canvasController();
    });

    this.canvaschangeSizeEmitter = emitter.addListener("canvaschangeSizeEmitter", (transform) => {
      this.canvaschangeSize(transform)
    });
    
    let ratio = 0,
    screen = window.screen,
    ua = navigator.userAgent.toLowerCase();
 
    if (window.devicePixelRatio !== undefined) {
        ratio = window.devicePixelRatio;
    }
    else if (~ua.indexOf('msie')) {  
      if (screen.deviceXDPI && screen.logicalXDPI) {
        ratio = screen.deviceXDPI / screen.logicalXDPI;
      }
    }
    else if (window.outerWidth !== undefined && window.innerWidth !== undefined) {
      ratio = window.outerWidth / window.innerWidth;
    }
    
    if (ratio){
      this.ratio = Math.round(ratio * 100);
    }
    alert(this.ratio);

  }

  canvasInit() {
    let canvas = this.canvas;
    let { source_image, addCanvasObject, addCanvasDom } = this.props;
    let tempImageDom = new Image();
    tempImageDom.crossOrigin = "";
    tempImageDom.src = source_image;
    tempImageDom.onload = () => {
      canvas.setWidth(tempImageDom.width);
      canvas.setHeight(tempImageDom.height);
      let fabricImage = new fabric.Image(tempImageDom, {
        top: 0,
        left: 0,
        evented: false,
        selectable: false,
        type: "background"
      });
      let c = new fabric.Circle({
        top: -100,
        left: -100,
        radius: 50,
        fill: "#f55",
        type: "dot"
      });
      this.canvas.add(fabricImage, c);
      this.canvaschangeSize();
      emitter.emit("toolUpdate", true);
    };

    addCanvasObject(canvas);
    addCanvasDom(this.__canvasDom);
  }
  canvasResultInit() {
    let canvasResult = this.canvasResult;
    let { result_image } = this.props;
    let resultImageDom = new Image();
    resultImageDom.crossOrigin = "";
    resultImageDom.src = result_image;
    resultImageDom.onload = () => {
      canvasResult.setWidth(resultImageDom.width);
      canvasResult.setHeight(resultImageDom.height);
      let fabricImageResult = new fabric.Image(resultImageDom, {
        top: 0,
        left: 0,
        evented: false,
        selectable: false,
        type: "background"
      });
      let c = new fabric.Circle({
        top: -100,
        left: -100,
        radius: 50,
        fill: "#f55",
        type: "dot"
      });
      canvasResult.add(fabricImageResult, c);
    };
  }
  canvasController() {
    let canvas = this.canvas;
    let radius;
    let canvasResult = this.canvasResult;
    let _this = this;
    canvas.on({
      "mouse:move": function (options) {
        if (!canvas.isDrawingMode) {
          return;
        }
        let { drawInfo } = _this.props;
        radius = drawInfo.width / drawInfo.scale;
        let fill;
        switch (canvas.freeDrawingBrush.rt_type) {
          case 1:
            fill = "rgba(0,0,255,.7)";
            break;
          case 2:
            fill = "rgba(255,0,0,.7)";
            break;
          case 0:
            fill = "#fff";
            break;
        }
        let oDot = canvas.getObjects("dot")[0];
        let oDotR = canvasResult.getObjects("dot")[0];
        oDot.set("fill", fill);
        oDot.set("top", options.pointer.y - radius / 2);
        oDot.set("left", options.pointer.x - radius / 2);
        oDot.set("radius", radius / 2);
        oDot.moveTo(canvas.size() - 1);
        canvas.renderAll();
        oDotR.set("fill", fill);
        oDotR.set("top", options.pointer.y - radius / 2);
        oDotR.set("left", options.pointer.x - radius / 2);
        oDotR.set("radius", radius / 2);
        oDotR.moveTo(canvasResult.size() - 1);
        canvasResult.renderAll();
      },
      "mouse:out": function (options) {
        if (!canvas.isDrawingMode) {
          return;
        }
        let oDot = canvas.getObjects("dot")[0];
        let oDotR = canvasResult.getObjects("dot")[0];
        oDot.set("radius", 0);
        oDotR.set("radius", 0);
        canvas.renderAll();
        canvasResult.renderAll();
      }
    });
  }
  canvasResultController() { }
  canvaschangeSize(transform = '') {
    let cHeight = this._canvasDom.offsetHeight;
    let cWidth = this._canvasDom.offsetWidth / 2;
    let canvasContentWidth, canvasContentHeight;
    let tempImageDom = this.canvas;
    let oCanvasLeft = document.querySelector(".canvasLeft");
    let { drawInfo, updateCanvasDrawInfo } = this.props;
    let scale;
    let tempRatio =
      tempImageDom.width / tempImageDom.height >= cWidth / cHeight;

    if (
      (tempImageDom.width >= tempImageDom.height && tempRatio) ||
      (tempImageDom.width < tempImageDom.height && tempRatio)
    ) {
      scale = oCanvasLeft.offsetWidth / tempImageDom.width;
    } else {
      scale = oCanvasLeft.offsetHeight / tempImageDom.height;
    }

    if (tempImageDom.width <= cWidth && tempImageDom.height <= cHeight) {
      canvasContentWidth = tempImageDom.width;
      canvasContentHeight = tempImageDom.height;
      if (tempRatio) {
        scale *= tempImageDom.width / cWidth;
      } else {
        scale *= tempImageDom.height / cHeight;
      }
    } else {
      canvasContentWidth = tempImageDom.width * scale;
      canvasContentHeight = tempImageDom.height * scale;
    }

    let tempTop = (cHeight - canvasContentHeight) / 2;
    let tempLeft = (cWidth - canvasContentWidth) / 2;

    if (transform) {
      let newS = drawInfo.scale;
      newS *= transform;
      canvasContentWidth = canvasContentWidth / scale * newS;
      canvasContentHeight = canvasContentHeight / scale * newS;
      let { canvasContentStyle } = this.state;
      let clientX = cWidth / 2;
      let clientY = cHeight / 2;
      tempTop = clientY - (clientY - parseFloat(canvasContentStyle.top)) / parseFloat(canvasContentStyle.height) * canvasContentHeight;
      tempLeft = clientX - (clientX - parseFloat(canvasContentStyle.left)) / parseFloat(canvasContentStyle.width) * canvasContentWidth;
      scale = newS;
      const LIMTLENGTH = 100;
      if (tempTop + canvasContentHeight < LIMTLENGTH || tempLeft + canvasContentWidth < LIMTLENGTH || cHeight - tempTop < LIMTLENGTH || cWidth - tempLeft < LIMTLENGTH) {
        return
      } else if (canvasContentHeight <= 100 || canvasContentWidth <= 100) {
        return
      }
    }

    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.width = parseInt(drawInfo.width / scale);
    }
    updateCanvasDrawInfo({ scale: scale })
    this.setState(state => {
      return {
        canvasContentStyle: Object.assign({}, state.canvasContentStyle, {
          top: tempTop + "px",
          left: tempLeft + "px",
          width: canvasContentWidth + "px",
          height: canvasContentHeight + "px"
        })
      };
    });
  }

  onCanvasMouseDownEvent() {
    let canvas = this.canvas;
    let canvasDom = this.__canvasDom;
    let { updateCanvasDomPixdata } = this.props;

    clearTimeout(this.drawPixDataSetTimes);
    updateCanvasDomPixdata(
      canvasDom.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
    );

    let canvasMouseUpEvent = addEventListener(window, "mouseup", e => {
      this.drawPixDataSetTimes = setTimeout(() => {
        this.updateDrawPixData();
      }, 500);

      canvasMouseUpEvent.remove();
      e.stopPropagation();
      e.nativeEvent.stopPropagation();
    });
  }

  onCanvasWheelEvent(e) {
    return;
    console.log(e.clientX, e.clientY);
    let { drawInfo, updateCanvasDrawInfo } = this.props;
    let zoom = (e.deltaY / 10000) * 4;
    let scale = drawInfo.scale - zoom;

    let cHeight = this._canvasDom.offsetHeight;
    let cWidth = this._canvasDom.offsetWidth / 2;
    let { canvasContentStyle } = this.state;
    let offset = this.getCanvasContentOffset();
    let canvasContentWidth = parseFloat(canvasContentStyle.width) / drawInfo.scale * scale;
    let canvasContentHeight = parseFloat(canvasContentStyle.height) / drawInfo.scale * scale;

    let tempTop = e.clientY - offset.top - (e.clientY - offset.top - parseFloat(canvasContentStyle.top)) / parseFloat(canvasContentStyle.height) * canvasContentHeight;
    let tempLeft = e.clientX - offset.left - (e.clientX - offset.left - parseFloat(canvasContentStyle.left)) / parseFloat(canvasContentStyle.width) * canvasContentWidth;
    const LIMTLENGTH = 100;
    if (tempTop + canvasContentHeight < LIMTLENGTH || tempLeft + canvasContentWidth < LIMTLENGTH || cHeight - tempTop < LIMTLENGTH || cWidth - tempLeft < LIMTLENGTH) {
      return
    } else if (canvasContentHeight <= 100 || canvasContentWidth <= 100) {
      return
    }
  console.log(tempTop,tempLeft,canvasContentWidth,canvasContentHeight);
    this.setState({
      canvasContentStyle: Object.assign({}, canvasContentStyle, {
        top: tempTop + "px",
        left: tempLeft + "px",
        width: canvasContentWidth + "px",
        height: canvasContentHeight + "px"
      })
    });

    updateCanvasDrawInfo({
      scale: scale
    })
  }

  onDragMoveMouseDownEvent(origin, e) {
    if (origin == "left" && this.canvas.isDrawingMode) {
      return;
    }
    this.setState({
      isMoving: true
    });
    let offset = this.getCanvasContentOffset();
    let { canvasContentStyle } = this.state;
    this.tempObj.offset = {};
    this.tempObj.offset.top =
      parseInt(canvasContentStyle.top) - e.clientY + offset.top;
    this.tempObj.offset.left =
      parseInt(canvasContentStyle.left) - e.clientX + offset.left;
    this.onDragMoveMouseMoveEventListener = addEventListener(
      window,
      "mousemove",
      e => {
        this.onDragMoveMouseMoveEvent(e);
      }
    );
    this.onDragMoveMouseUpEventListener = addEventListener(
      window,
      "mouseup",
      e => {
        this.onDragMoveMouseUpEvent(e);
      }
    );
  }
  onDragMoveMouseMoveEvent(e) {
    if (this.state.isMoving) {
      let offset = this.getCanvasContentOffset();
      this.setState(state => {
        return {
          canvasContentStyle: Object.assign({}, state.canvasContentStyle, {
            top: e.clientY - offset.top + this.tempObj.offset.top + "px",
            left: e.clientX - offset.left + this.tempObj.offset.left + "px"
          })
        };
      });
    }
  }
  onDragMoveMouseUpEvent(e) {
    this.setState(state => {
      const LIMTLENGTH = 100;
      let cHeight = parseInt(state.canvasContentStyle.height);
      let cWidth = parseInt(state.canvasContentStyle.width);
      let cTop = parseInt(state.canvasContentStyle.top);
      let cLeft = parseInt(state.canvasContentStyle.left);
      if (cTop + cHeight < LIMTLENGTH || cLeft + cWidth < LIMTLENGTH || this._canvasDom.offsetHeight - cTop < LIMTLENGTH || this._canvasDom.offsetWidth / 2 - cLeft < LIMTLENGTH) {
        return {
          isMoving: false,
          canvasContentStyle: Object.assign({}, state.canvasContentStyle, {
            top: (this._canvasDom.offsetHeight - cHeight) / 2 + "px",
            left: (this._canvasDom.offsetWidth / 2 - cWidth) / 2 + "px",
          })
        }
      } else {
        return {
          isMoving: false
        }
      }
    }, () => {
      this.onDragMoveMouseMoveEventListener.remove();
      this.onDragMoveMouseUpEventListener.remove();
      delete this.tempObj.offset;
    });




  }

  getCanvasContentOffset() {
    return {
      top: 58,
      left: 70 + this._canvasDom.offsetWidth / 2
    };
  }

  updateDrawPixData() {
    let canvas = this.canvas;
    let canvasDom = this.__canvasDom;
    let { canvasDomPixData, userToken } = this.props;
    let canvasDomWidth = canvas.width,
      canvasDomHeight = canvas.height;
    let nowPixData = canvasDom
      .getContext("2d")
      .getImageData(0, 0, canvasDomWidth, canvasDomHeight);
    console.time("for");
    for (let i = 0; i < canvasDomHeight; i++) {
      for (let j = 0; j < canvasDomWidth; j++) {
        if (
          canvasDomPixData.data[(i * canvasDomWidth + j) * 4] !=
          nowPixData.data[(i * canvasDomWidth + j) * 4] ||
          canvasDomPixData.data[(i * canvasDomWidth + j) * 4 + 1] !=
          nowPixData.data[(i * canvasDomWidth + j) * 4 + 1] ||
          canvasDomPixData.data[(i * canvasDomWidth + j) * 4 + 2] !=
          nowPixData.data[(i * canvasDomWidth + j) * 4 + 2] ||
          canvasDomPixData.data[(i * canvasDomWidth + j) * 4 + 3] !=
          nowPixData.data[(i * canvasDomWidth + j) * 4 + 3]
        ) {
          if (canvas.freeDrawingBrush.rt_type != 0) {
            console.log("pushed");
            this.drawPixData = Object.assign(this.drawPixData, {
              [j + "_" + i]: canvas.freeDrawingBrush.rt_type
            });
          } else {
            delete this.drawPixData[j + "_" + i];
          }
        }
      }
    }
    console.timeEnd("for");

    let foreground = [],
      background = [];

    for (let [key, value] of Object.entries(this.drawPixData)) {
      if (value == 1) {
        foreground.push(key.split("_"));
      } else if (value == 2) {
        background.push(key.split("_"));
      }
    }
    /*console.log(
      "foreground",
      foreground.length,
      "background",
      background.length
    );*/

    if (foreground.length == 0 || background.length == 0) {
      return;
    }
    this.setState({
      resultLoading: true
    });
    let width_pre = 1;
    let height_pre = 1;
    let show_type = "touming";
    let k_value = 80;
    let weight = 6000;
    let kernel = 7;
    let iteration = 10;
    let divid_r = 13;
    let divid_d = 23;
    let data = new FormData();
    data.append("fore", JSON.stringify(foreground));
    data.append("back", JSON.stringify(background));
    data.append("width_pre", width_pre);
    data.append("height_pre", height_pre);
    data.append("show_type", show_type);
    data.append("k_value", k_value);
    data.append("weight", weight);
    data.append("kernel", kernel);
    data.append("iteration", iteration);
    data.append("divid_r", divid_r);
    data.append("divid_d", divid_d);
    data.append("userToken", userToken);

    assetManager.getImageClipDone(data).then(res => {
      if (res.img.length > 50) {
        this.canvasResult.getObjects("background")[0].getElement().src =
          res.img;
        canvasStore.dispatch(
          paintOnCanvas("UPDATE_CANVAS_RESULT_IMAGE", res.img)
        );
        this.canvasResult.clear();
      }
      this.setState({
        resultLoading: false
      });
    });
  }

  render() {
    let { canvasContentStyle, resultLoading } = this.state;
    return (
      <div
        className={"canvas"}
        ref={ref => {
          this._canvasDom = ref;
        }}
      >
        <div
          className={"canvasPanel canvasLeft"}
          onMouseDown={this.onDragMoveMouseDownEvent.bind(this, "left")}
        >
          <div className={"canvasTips"}>原图</div>
          <div
            className={"canvasContent"}
            onMouseDown={this.onCanvasMouseDownEvent.bind(this)}
            onWheel={this.onCanvasWheelEvent.bind(this)}
            style={canvasContentStyle}
          >
            <canvas
              id="canvas"
              ref={canvas => {
                this.__canvasDom = canvas;
              }}
            />
          </div>
        </div>

        <div
          className={"canvasPanel canvasRight"}
          onMouseDown={this.onDragMoveMouseDownEvent.bind(this, "right")}
        >
          <div className={"canvasTips"}>效果</div>
          {resultLoading && (
            <div className={"canvasLoading"}>
              <i className={"iconfont icon-xuanzhuan"} />
              生成中
            </div>
          )}
          <div
            className={"canvasContent"}
            style={canvasContentStyle}
            onWheel={this.onCanvasWheelEvent.bind(this)}
          >
            <canvas id="canvasResult" />
          </div>
        </div>
      </div>
    );
  }
}

export default (Canvas = connect(
  mapStateToProps,
  mapDispatchToProps
)(Canvas));
