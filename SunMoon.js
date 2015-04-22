var SunMoon = SunMoon || {};

SunMoon.GameSystem = cc.Class.extend({
    _ecs:null,

    ctor:function(){
        if(SunMoon.gamesystem != null) cc.assert("GameSystem is singleton");
        SunMoon.gamesystem = this;
        this._ecs = new SunMoon.ECSManager();
        cc.director.getScheduler().scheduleCallbackForTarget(this, this.update, 0, cc.REPEAT_FOREVER, 0, false);
        this.init();
    },

    init:function(){
        this.getECS().registerSystem(new NodeSys());
        this.getECS().registerCom(new NodeCom());

    },

    update:function(dt){
        this._ecs.update(dt);
    },

    clearUp:function(){
        cc.director.getScheduler().unscheduleCallbackForTarget(this, this.update);
        SunMoon.gamesystem = null;
        //销毁this._ecs的东西
        this._ecs = null;
    },

    /**
     * @returns {SunMoon.ECSManager}
     */
    getECS:function(){
        return this._ecs;
    }
});

SunMoon.MainInit = function(screenType, cb){
    if(cc.sys.isNative){
        cb();
        return;
    }
    SunMoon.ScreenUtil.setType(screenType);
    cc.loader.loadImg(SunMoon.ScreenUtil.changeImg, {isCrossOrigin : false }, function(err, img){
        cc.loader.cache["SceneChange.png"] = img;
        cb();
    });
};


SunMoon.audioEngine = cc.Class.extend({
    _isMuteEffect:false,
    _isMuteBG:false,

    _effectLoopList:null,

    ctor:function(){
        this._isMuteEffect = false;
        this._isMuteBG = false;

        this._effectLoopList = [];
    },

    playBG:function(url, loop){
        cc.audioEngine.playMusic(url, loop);
        if(this._isMuteBG) cc.audioEngine.pauseMusic();
    },

    playEffect:function(url, loop){
        if(loop === undefined){loop = false;}

        var effect;
        if(loop){
            effect = cc.audioEngine.playEffect(url, loop);
            if(this._isMuteEffect) cc.audioEngine.pauseEffect(effect);
            this._effectLoopList.push(effect);
        }else{
            if(this._isMuteEffect) return null;
            effect = cc.audioEngine.playEffect(url, loop);
        }
        return effect;
    },

    pauseAllEffects:function(){
        for(var i = 0, len = this._effectLoopList.length; i < len; i ++){
            cc.audioEngine.pauseEffect(this._effectLoopList[i]);
        }
    },

    resumeAllEffects:function(){
        for(var i = 0, len = this._effectLoopList.length; i < len; i ++){
            cc.audioEngine.resumeEffect(this._effectLoopList[i]);
        }
    },

    stopEffect:function(audio){
        var index;
        for(var i = 0, len = this._effectLoopList.length; i < len; i ++){
            index = this._effectLoopList.indexOf(audio);
            if(index >= 0){
                this._effectLoopList.splice(i, 1);
                cc.audioEngine.stopEffect(audio);
                break;
            }
        }
    },

    muteBG:function(value){
        if(this._isMuteBG == value) return;
        this._isMuteBG = value;

        if(value) cc.audioEngine.pauseMusic();
        else cc.audioEngine.resumeMusic();
    },

    muteEffect:function(value){
        if(this._isMuteEffect == value) return;
        this._isMuteEffect = value;

        if(value) this.pauseAllEffects();
        else this.resumeAllEffects();
    }
});

SunMoon.SoundManager = new SunMoon.audioEngine;

SunMoon.ScreenUtil = {
    H_TO_V:1,
    V_TO_H:2,

    isInitChange:false,
    isChange:false,
    isLoaderOver:false,

    changeType:0,

    changeImg:null,

    setType:function(type){
        this.changeType = type;
        switch(type){
            case this.H_TO_V:
                this.changeImg = "";
                break;
            case this.V_TO_H:
                this.changeImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATYAAAD9CAYAAAA25FtqAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAKTWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVN3WJP3Fj7f92UPVkLY8LGXbIEAIiOsCMgQWaIQkgBhhBASQMWFiApWFBURnEhVxILVCkidiOKgKLhnQYqIWotVXDjuH9yntX167+3t+9f7vOec5/zOec8PgBESJpHmomoAOVKFPDrYH49PSMTJvYACFUjgBCAQ5svCZwXFAADwA3l4fnSwP/wBr28AAgBw1S4kEsfh/4O6UCZXACCRAOAiEucLAZBSAMguVMgUAMgYALBTs2QKAJQAAGx5fEIiAKoNAOz0ST4FANipk9wXANiiHKkIAI0BAJkoRyQCQLsAYFWBUiwCwMIAoKxAIi4EwK4BgFm2MkcCgL0FAHaOWJAPQGAAgJlCLMwAIDgCAEMeE80DIEwDoDDSv+CpX3CFuEgBAMDLlc2XS9IzFLiV0Bp38vDg4iHiwmyxQmEXKRBmCeQinJebIxNI5wNMzgwAABr50cH+OD+Q5+bk4eZm52zv9MWi/mvwbyI+IfHf/ryMAgQAEE7P79pf5eXWA3DHAbB1v2upWwDaVgBo3/ldM9sJoFoK0Hr5i3k4/EAenqFQyDwdHAoLC+0lYqG9MOOLPv8z4W/gi372/EAe/tt68ABxmkCZrcCjg/1xYW52rlKO58sEQjFu9+cj/seFf/2OKdHiNLFcLBWK8ViJuFAiTcd5uVKRRCHJleIS6X8y8R+W/QmTdw0ArIZPwE62B7XLbMB+7gECiw5Y0nYAQH7zLYwaC5EAEGc0Mnn3AACTv/mPQCsBAM2XpOMAALzoGFyolBdMxggAAESggSqwQQcMwRSswA6cwR28wBcCYQZEQAwkwDwQQgbkgBwKoRiWQRlUwDrYBLWwAxqgEZrhELTBMTgN5+ASXIHrcBcGYBiewhi8hgkEQcgIE2EhOogRYo7YIs4IF5mOBCJhSDSSgKQg6YgUUSLFyHKkAqlCapFdSCPyLXIUOY1cQPqQ28ggMor8irxHMZSBslED1AJ1QLmoHxqKxqBz0XQ0D12AlqJr0Rq0Hj2AtqKn0UvodXQAfYqOY4DRMQ5mjNlhXIyHRWCJWBomxxZj5Vg1Vo81Yx1YN3YVG8CeYe8IJAKLgBPsCF6EEMJsgpCQR1hMWEOoJewjtBK6CFcJg4Qxwicik6hPtCV6EvnEeGI6sZBYRqwm7iEeIZ4lXicOE1+TSCQOyZLkTgohJZAySQtJa0jbSC2kU6Q+0hBpnEwm65Btyd7kCLKArCCXkbeQD5BPkvvJw+S3FDrFiOJMCaIkUqSUEko1ZT/lBKWfMkKZoKpRzame1AiqiDqfWkltoHZQL1OHqRM0dZolzZsWQ8ukLaPV0JppZ2n3aC/pdLoJ3YMeRZfQl9Jr6Afp5+mD9HcMDYYNg8dIYigZaxl7GacYtxkvmUymBdOXmchUMNcyG5lnmA+Yb1VYKvYqfBWRyhKVOpVWlX6V56pUVXNVP9V5qgtUq1UPq15WfaZGVbNQ46kJ1Bar1akdVbupNq7OUndSj1DPUV+jvl/9gvpjDbKGhUaghkijVGO3xhmNIRbGMmXxWELWclYD6yxrmE1iW7L57Ex2Bfsbdi97TFNDc6pmrGaRZp3mcc0BDsax4PA52ZxKziHODc57LQMtPy2x1mqtZq1+rTfaetq+2mLtcu0W7eva73VwnUCdLJ31Om0693UJuja6UbqFutt1z+o+02PreekJ9cr1Dund0Uf1bfSj9Rfq79bv0R83MDQINpAZbDE4Y/DMkGPoa5hpuNHwhOGoEctoupHEaKPRSaMnuCbuh2fjNXgXPmasbxxirDTeZdxrPGFiaTLbpMSkxeS+Kc2Ua5pmutG003TMzMgs3KzYrMnsjjnVnGueYb7ZvNv8jYWlRZzFSos2i8eW2pZ8ywWWTZb3rJhWPlZ5VvVW16xJ1lzrLOtt1ldsUBtXmwybOpvLtqitm63Edptt3xTiFI8p0in1U27aMez87ArsmuwG7Tn2YfYl9m32zx3MHBId1jt0O3xydHXMdmxwvOuk4TTDqcSpw+lXZxtnoXOd8zUXpkuQyxKXdpcXU22niqdun3rLleUa7rrStdP1o5u7m9yt2W3U3cw9xX2r+00umxvJXcM970H08PdY4nHM452nm6fC85DnL152Xlle+70eT7OcJp7WMG3I28Rb4L3Le2A6Pj1l+s7pAz7GPgKfep+Hvqa+It89viN+1n6Zfgf8nvs7+sv9j/i/4XnyFvFOBWABwQHlAb2BGoGzA2sDHwSZBKUHNQWNBbsGLww+FUIMCQ1ZH3KTb8AX8hv5YzPcZyya0RXKCJ0VWhv6MMwmTB7WEY6GzwjfEH5vpvlM6cy2CIjgR2yIuB9pGZkX+X0UKSoyqi7qUbRTdHF09yzWrORZ+2e9jvGPqYy5O9tqtnJ2Z6xqbFJsY+ybuIC4qriBeIf4RfGXEnQTJAntieTE2MQ9ieNzAudsmjOc5JpUlnRjruXcorkX5unOy553PFk1WZB8OIWYEpeyP+WDIEJQLxhP5aduTR0T8oSbhU9FvqKNolGxt7hKPJLmnVaV9jjdO31D+miGT0Z1xjMJT1IreZEZkrkj801WRNberM/ZcdktOZSclJyjUg1plrQr1zC3KLdPZisrkw3keeZtyhuTh8r35CP5c/PbFWyFTNGjtFKuUA4WTC+oK3hbGFt4uEi9SFrUM99m/ur5IwuCFny9kLBQuLCz2Lh4WfHgIr9FuxYji1MXdy4xXVK6ZHhp8NJ9y2jLspb9UOJYUlXyannc8o5Sg9KlpUMrglc0lamUycturvRauWMVYZVkVe9ql9VbVn8qF5VfrHCsqK74sEa45uJXTl/VfPV5bdra3kq3yu3rSOuk626s91m/r0q9akHV0IbwDa0b8Y3lG19tSt50oXpq9Y7NtM3KzQM1YTXtW8y2rNvyoTaj9nqdf13LVv2tq7e+2Sba1r/dd3vzDoMdFTve75TsvLUreFdrvUV99W7S7oLdjxpiG7q/5n7duEd3T8Wej3ulewf2Re/ranRvbNyvv7+yCW1SNo0eSDpw5ZuAb9qb7Zp3tXBaKg7CQeXBJ9+mfHvjUOihzsPcw83fmX+39QjrSHkr0jq/dawto22gPaG97+iMo50dXh1Hvrf/fu8x42N1xzWPV56gnSg98fnkgpPjp2Snnp1OPz3Umdx590z8mWtdUV29Z0PPnj8XdO5Mt1/3yfPe549d8Lxw9CL3Ytslt0utPa49R35w/eFIr1tv62X3y+1XPK509E3rO9Hv03/6asDVc9f41y5dn3m978bsG7duJt0cuCW69fh29u0XdwruTNxdeo94r/y+2v3qB/oP6n+0/rFlwG3g+GDAYM/DWQ/vDgmHnv6U/9OH4dJHzEfVI0YjjY+dHx8bDRq98mTOk+GnsqcTz8p+Vv9563Or59/94vtLz1j82PAL+YvPv655qfNy76uprzrHI8cfvM55PfGm/K3O233vuO+638e9H5ko/ED+UPPR+mPHp9BP9z7nfP78L/eE8/sl0p8zAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAACsTSURBVHja7J15fJPXme9PQ9Kmk05TsF9J76rVu7Et2ZYtGa9sIUDDTgwhEPbNELZAAINtwCw2m82+hCUbAQKGQEjambSdmTvJzLS5nSbTcgwJnenczp2bztaWm+YzM3nmD0mOLLzJlmRJ/r2fz/dj2ZLFy9F5v36ec55zXsbCe5gYY0WMsfGMsYVetjDGagAAA4Ytftf/eK8TTCyGjkcYYymMsQmMsXX4QAEAXbDO64oUrzui7jAwxqYzxjbhwwIA9IJNXocYokFogxljE/GhAABCyESvWyJ+fJMx9gRjrBofAgAgDFR7HfPNSEnNxhjbgIYHAESADV7nhPUoxKwmACDCbPG6J+THIO/sBRoZANBfTPC6KCTHY4yxuWhUAEAUMNfrpD4djzLGFqAxAQBRxAKvm3qdfs5GIwIAopDZvU1Ln0TjAQCimCeDlVo6Gg0AEAOk91Rq32aoUwMAxE6d27d7IrbJaCwAQAwxuTupaWgkAEAMonUlNtSrAQBikbmI1gAAAyZqq0TDAABimMpAqT3GsLgdABD7i+XbLbcqRKMAAOKAQkwaAADidhLhEYZ7FQAA4oNqr9OYDY0BAIgjbIwxVoKGAADEESWMMTYFDQEAiCOmMIaNJAEA8cUCxhhbjYYAAMQRqxljbCMaAgAQR2xkaAQAQByCRgAAQGxB8eg3vlGXlpqy/8kxT7y0vXbrDxt27fxgV/2O93ft2vXBwGL3B7t21n+wq37b+3t373h//drnb+Tl5jb/8be+tR2dEIAYEZtBr9+1dPGCq00H93/4xqVLvz1+6uR/b9u+jVatXkWLFy+mefPm0fz5A4uFixZQ1Yoqqt5STYePHKYLb1z6w4mjRz5+Ye2aW6mpqfvRGQGIYrENLy8+efrkydsXL1+h6q1baNxTT9LQrEwymY0kSQbS6RJJSBxCghApEgIeJ/j9LCFi56HTJZJeL5CmypSRkUYVwyuoasUKOnvuZbp08fI/rV5ZdQMdEoAoE9u3vvXY9tXPP3/r2rVrv6vfWU+lZaVkNEkkGgRSFIlMZpXMFo2sNhPZksxktZkihDHgsdHvZ8aInYctyUwWi0Yms0aqJpEkCSTLerLnZtOq1Svp2rW3vqyp2fpnSTbrXnRMAKJAbIkJQ+qPHW3+uOXqtS8XLFxIZosnOjOaVLLaLGS1mslqNfULFt9Xi5Es3u99P7PZIn9enn/TSBarmcxmI8mqSIoq0thxY+js+XP0+muv/J9ch/0QOicA/Sy2A/saftJy9SpNmzbZIzSj6pVZlGAxk8Viiq5z8sNsNpIo6mnYMBedPHWSLrz+yq+sFlMjOigA/SS2eXNmvXn5yvXPZ86aSaKojyqBWCymNtLSUsjtLqScnKx2P4+Wc7XZLCSKeioudtOrr71Gu3ftfP/RR79Rh04KQITFVlLkOvrWjbfur163hmRFJLPZGHXRkM1mIbPZSFlZmVRSMoxyc+1RJzX/89TrE2nypIl09eq1/5w+dfKr6KQARFBsgwYNqm3Ys/P9E6dOU3Z2Jsmy2C8yCEYa/lFctKalRqNGiiLR1q1b6cIbF/45MyMNpSAAREps6Wkp+9+6fvP+rGefJVGKXArqn0Z2Jzbf875zMxrVqBeczWYhUTJQaWkxXXzzMi1a8NwVdFQAIiS2+XPnXjr50tkv7fZMkhWRrLbISM1k0shk0roVn2cm1PTAeJrvsdlsJLPZ2O710TM2aCFNU6i2ro5Onzp+Gx0VgAiJ7VBz89+u27ieZFkgUwTG1nwCyshIo8zMdLLZLGSxdPw6q9XiFwFZva+zBPzc8kDE19H79U/UZiVJNtDESZPo6pWr/5bnsDejswIQAbFdvnTpd9Ofnk4Ggz7sQvN9zcxMo+LiIiouLqbs7Oy2iMv/dQ6HndzuInK5XFRU5Ca3201FRUXkdrvJ7S7qADcVFQ0jp9NJSUm2KIncTKRqMuXm5dIbr7/630sWzb+GzgpABMT2xsXLn5eWlZIkGSISrXlmNjPI7XaRy+Umuz27wxTTbs+hoiKP2Dwy656ioiJyOp2UnJwUVbVtScnJdOTIETrU3PwROisAERBbw8FD97Ozs0hTxXYpXvijtkzKysoiq9XaiRDMZDKZyGTyPDYatbZxuY7xvM5sjp5U1Cc2s9lML2yqpq31uz9GZwUgAmKr3t5wPy01lUyaSBabOWJi0zSVVFUls7nzgXej0UQmk4mMRmMPxOZ5jdlsCruge4zNQlar5/+6eMVaWrtpB8QGQCTEVlPfeD89NY1MRoUsNmvESiFsbRK1dFvm4Zsg6AlRVfJh9awnVY0yLVu5jl7YWA+xARAJsR05cep+RkYaaZpKVmtS1Ba8xiI2r7RVo0ibt26mfQebITYAIiG2s2fP3s/ISCdNUzod7wJ9iU7NpKoybdteS0eOHobYAIiE2M6cOXM/IyOdVE0hW5IJMgp5zZ6RVFWhbdu20eHDEBsAERNbenoaaZpMVogtLHJTVYXq6uogNgAgNogNAIgtxGILXJ8JggNiAyBKxOYbY7PZLJScnBRyUlKSvY+TKSUlqR3JycntSEkJH4H/1oPnmtwF3f8fbX5lMxAbAP0dsdk89xFITU2h/Pz8kFNcXEwVFRVUVlZG5eXl7SgrK4sYpaWl7SgpKekxxcXF7Qh8vrS0lLKzs/2iNogNgH5PRS0Wj9hcLhe5XC4qLCwMCQUFBVRUVESjRo2iJ554gkaPHt0lo0aNChkjR47skhEjRrT7fvjw4Z1SUVHRjsDnR44cSQ6Ho22fOURsAERBxGa2GCktLYWczgIqKAgt+fn5NGzYsE7lEi6ClVPg84HRZWeUlZVRRUUF2e1279IupKIAREcq6hVbQUFBW6QVKnzvV1ZWRqNHj+43sXUnsmDEFpjmVlRUkMNhb3ffCIgNgDgXm9PpJJfLRRUVFW1CGz58eNCy6irii6TIIDYABrjYfDidTho2bFiboHoThQWKLVwiC3ZiA2IDYICmor6vJSUlvY7Y+iKyvogtcEYVYgMAEVu7qK2goIDKy8tp1KhRYRVbR8+HKkKD2ACA2B6YJS0qKupRxNbXcbNwpZ4QGwAQW7uIzTeZUFxc3OcJgJ6WZIRaZBAbABBbp4IrKysLqvasvyIyiA0AiK3H+EpAOovW+iqzcIrNfyKhvLy8ndhQoAvAABabb8nViBEjerQaIFrEFjhLCrEBALE9QGlpadiLaEMpMogNAIit2/KPwsJCKi8v7zBS669UszvR+e/uUVZWRnZ7TrsxNk1TsTU4AANZbE6nk4qKiqJqQqC7KC2wYBdiAwBie6D8w1cCMnz48KiI0iA2ACC2Pi23CiwBiXaRBW40CbEBALE9ELX5UlL/EpCOdt3tSkaBzwUrxb6IrbS0FGIDAGLrGt924uGM0oKVV3fk5ORgVhQAiK3rCM6X4kWjyDq6BwLEBgDE1qNVCR2lmBAbABBbzIkt8EYwvnQ0WMkFM2bWkdgC5dUVEBsAEFvQ422hHvzva4QGsQEAsYVkF5DuZkX7KrJgIrRhw4a1I5bENjWZHa9xsUuPf4Ntx0UEILZ+pKioKOQlGgNNbNofs10XxrL3vljJvviLp9lPH32Y1eEiAhBbP423+aek/jLz1Y+FqlyjK9EFiiyQ4uLiqBXb4EfZ9hoXu/hPi9j/o9WMaDWjP5vOPvz6IFaLiwhAbP2Yivpu3+eTWXdSC3eEFitiW5rNzn34DPu5T2g+fjQNYgMQW7+Kzf+xy+XqcHeNUEwABCuzaBZbqcKa3pvKfvz/V7DPA6UGsQGILYqiNv9dQMIxsxmMyKJVbIMfZdvPPcG+/x/L2W87EhrEBiC2KKWwsJCKi4vbxOZfchEpkUWb2B7/Btu+No+9+qsF7NddCc3HD6ayH+MCAhBblEVwvlUJXUVtA0Vsz6SxU+9Xsr/tidB8vF/JfpYlsMbUIawhFHz762wbLkgAsfUhWvONuxUVFbVNIoR6zCwWxJZvYPtvTGB/2dk4Wlf8djn7/S/ns199Oo/9w6fz2K/6ys+eZfyDSvaztyeyv9xfxq67RHYAFyiA2HopuKKiorY0NFixFRUVtSNWxPbow6zu+Ah267Ml7F+CFVok+HI1+/KzJexf/uJp9tOxFnYEFyqA2HohOJ9YIhmhdYRPbDZbeMT2Rw+zumU57PzfL2D/+OVq9mU0Si2Qz1ewP1wYy36AVBVAbEGOt7nd7rgX23gLO/KjaezDWJBZR3xQyX6WLbC9uGgBxBZEnVtfU8lg6SiNDYfY8vRs36Vx7Ie/r2L3Y1VqPj6dx37lljD2BiC2oFJS33hbOCQXKLJAqRUXF1N2dnZIx9hGaKz5l/PZP8a60Pz5eDa7Y3mc7cbFCyC2Xsgt1Klof4hN/0esvsrOzvPn2L0v40hul8axH+LiBRBbkLvuRlpsPrmFWmw+Hn6I1e4vY9f+eTH7TTyI7bfL2e+esrKjuIABxBbEvRJ8UVuo5eWP2+1u4yuxZZHFYiKbzUJWa+hnRa3fYbuvPcX+/N+Xdb1cKhZ4ZxL7ANsmAYgtyFUJ/rIKt9h8cvOJLdx1bE+nsBN/Np19GMvp6ecr2OeYSAAQW5C43e6wiqw/xeZLT5dms3OfzGP/EKty21PCruIiBhBbkCUgPrn5ZkqDpTuZ9afYfAjfZDuaK9iNf1/G/iPYtaKZiaFZK5qnZ/tedLILH89md4KJIn80jX2IixhAbH0sAYlHsfnITGSNtyax939fxX7fQ6n8JNTnkPAo2/HXM9hHwdS1PfQ1XMgAYutVShrMOFlnz7tcrnZEm9h8zMtkZ/56Bvu4J9FSOPZjW5bDzn+xkn3RE7H961L2b9gTDkBsvYzafJMJoYzQOhJddnZWVOyg+/BDrHZzAXvj0y7G38IltmEyO/h/F7PPeiK2/1jOfgexAYitlzeC8aWkoRRZNIvNh+Vxtvv4CHaro+VY4RJbnp7t+/Ui9s89FNtvITYAsfXhDleFhYUPpJvxLjZ/2fxoGvvJ5377tv1oGvtJOKSSb2D7/wliAxBbZFclhFJmsSI2H1V2dv7j2ayVVjP66xns44cfgtgAxBZXkwkDUWyMsZqvD2K1x0ewt4+PYLfCsUcaxAYgtn6cTAhWXPEiNh/feoRtQyoKILY4G3MLpdRiUWzhAmIDEFsUjbf1RmSBZGX1fx0bxAYgtgEsNn+5hSpqg9ggNgCx9evWRuFISSE2iA1AbP0qNp/cfJMJwVJYWNgOiA1iAxBbVM6UBiOyjsQ2dOhQTB5AbABig9ggNogNQGwRlVt3MoPYIDYAscXMTGmwUvMxdOhQjLFBbABii06x9UZqEBvEBiC2qE5JITaIDUBsA1JwD77eBbFBbABiiy25df9aiA1iAxBb3EkQYoPYAMQGsUFsEBuA2CA2iA1AbBBbyNeVQmwQG4DYELFBbBAbgNggttjHJbID/7qU/VtPxPaHlewLiA1AbBBb1JM6hDX8YCr78c/nsLvd8Vcz2EfhuFMWgNggNogNAIgNQGwAQGwQG8QGAMQGsQEAsUFsEBsAEBvEFgtie/zxb+8oLy05MX/+/CtLli279vQzs1smTpvRMrXymZYFixa3LF22tGXJkiUAhJWlS5e2LFm6tKVy1pyWSdOfaZn89DMt8xYsblmxYsX1qVMmv5KTnd0EsUFs3ZKSbNs3fcqk13bv3P5+U9PBv6uv3/Fp1cqqe9+dNPlexagn7pUPH3lvzLix98aNG39v3LixAISV8ePH3xs/fty94aNG3yutGHmvYsToe5OnTrtXVVX1yy01W/muPQ0/3bpl6w9nVE57/fHHv70DYoPY2vHIww/XTnxq/Pnm5gM/azp4oLWqqupuaXnpHVuStVWS9VwUBS6JAhcNAtfrBC4IPhIBCBs6b18TDQIXdQlc1Cdyg0HXKkkSN1tMre6igrsLFi68u3ffgdY9e3b/1dgxo16C2CC2GsZYjSAk7Fy1cvnbhw8f+fm6dWvuulwFrXqDjut0CVyS9FxRZK6oEldViWuazFXViyYB0CcU/+/VDp5XJa6oqgdN4ooicVmWuKxIXJZErtcncEGXwB32nNaqlVV3Dh0+8osZldMvJCYMqYfYBrDYhMSEnZs3vfjeseOnP33mmWdaNU3liUICV1TZIzFF4oqicE1TuKopXFUVrqoy1zSFa4EdVf3qq6J6OiEA3eHrLx39sdQ0iSuqwhVF4YqmcEWVvf1Q+qo/agrX6QQuSno+YeLE1uZDhz+t3rThPVky7IbYBqDYdIkJO7ds2vCDw0ePfTph4kQuCAncoBc84lJlb6eTe4yieGSoaUpQvweA749lsH3O/3clycATEwfzioqy1oNNTfeqli15a9CgQbUQ2wASW2LC4J2b1q/5wanTZz6dOr2yVacTuCTqA0QVbCdTuNls5mlpaTw9PZ2npaUB0C3p6ek8IyOd22zWPstRkkQuCAl89OhRd5qbj9weP/aJsxDbABLb0gWzr7109ty9qqoVrYoscUkS+yg1mcuyzK1WK8/KygKgRwwdOrTtcVJSUq8jtvZyM3BBSOSz58y+W1+/431JDDolhdhiUWxlw/KPNjft/7hhb+OdoUMzPOmnInnGL/qAosjcajW367QA9ISsrCyenJzMFaUv/U/yjv0qXK8XuM1m5TU1dXfXrVlz65FHHq6F2OJYbIMGDapdvXze22fPnL5XWVnJdTohJH8lfR0LYgP9JbbAMbdEYTAfN37cnca9e39q1NQGiC2OxTZk8OP1Bxt3fti4d88dh93OdYLQNoMJsYF4EZuqKVyU9dxmM7XW1NXxyunTXoPY4lhsTz1Z/tKZk6fuLF9RxVVZbje21le5QWwgasSmKlxRFa7XJ7Y++9xzd1etev4mxBbHYls8p/LyyZPH70ybNpULQmKbzEJRogGxgegRm6cmTm8Q+MiRwz/Zvq3uf0FscSy2hXMqLx8+3HynvKKMC8IQrmqh60gQG4g2sRlEHXc47Hfr67f/b4gtjsW25LmZb+7fv/eOsyCP63UJIS2whNhAtIlNkgw8JTXlbs3WLRBbPItt0XMz39y3b++d3Fy7J2KD2EA8i00WucVivltdXQ2xxbXY5s58s7Gx8U5uroMLOqFt7SfEBuJNbIrqidggNogNYgMQG8QGsUFsAGKD2CA2ACA2ALEBiA1ig9ggNgCxQWwQG8QGIDaIDWKD2ADEBrFBbABAbBAbxAYgNogNQGwgHoDYAMQGYjYy83+cmZnJMzMzeU5ODk9NTeWyLHXbx3q6byDEBrFBbKDfsNvt3OVy88zMDC5JUpf9Kxi5QWwQG8QGIkpmZibPysriubm53O12c7fbzdPT07uM2Hz3HdU0hZtMWrdyg9ggNogNRDxKKygoaJOa2+3mGRkZ3aaikiTy1NQUnpOTxVNSur5dH8QGsUFsIKzjar6xtKysLO5wONpJzeVyecXWdcTmeU7lWVnZ3G638+zsoV3eqwNig9ggNhC2lNM/9XQ6nbywsJC7XK62rz0Vm6LIXJIknpKSyrOzc3hqakq7cTeIDWKD2EBExWa323lhYWEbBQUFbULrqdh8cvMfY+vqJkQQG8QGsYGwkJ2dzfPz89tJzZ9gIrYH09L2EwsQG8QGsYGwRGf+qafdbm9LPbvCJ7buZkU7Kv3ArCjEBrGBsJZu+E8Q5Obm8oKCgm6l1luxoUAXYgtSbJ7iR0kSuSjqucGg46Ko55Ikdl83BLEN+LG0nJycttQznGJDxAaxdSk2/7EJRZG4KBq4KOp5UpKVOxx2Xljo5A6HnVssJq7TCdxg0EFsoNPaNKfTyQsKCtq+hkNsmqZxq9XKNU2D2CC2ALE5PGJT/KRkMOh5WloanzZtGl+7di2vrt7Mt2+v4zt37uC1tTV81qyZ3Gq1cEFI6Hh6HWIbsHVqeXl53Ol0tqOgoKAd3cmte7Ep3GAwcKvVyvPz87nNZu26PARiG6BiExK54hWSXi9wl6uQr1+/nq9Zs4aPHz+eFxQ4eXb2UO52u/js2bN4c/NBvmfPLm6353BBSITYBnjBrS9Ky8/PbyezcIlNUWSu1xu4zWbj+flObrPZsPIAYgtMRXO5oBO4rEjcYNDxvDwH37z5RT5z5kxuNpu5IAhcEASu0yVyQRjCExIG85SUJF5dvZk3Nx/kmZnp3GDQPZDKQmwDp4zD4XC0ScxfbuEUm8EgcpvNxp1OJ7dabYjYILaOx9gkSeImk8aXL1/K58yZzSXJwPV6wbsvlsJVVWlbfJyQMJhrmsrr63fwdevWcINB165jQWzxV7rhi8z8ycnJaZd6diS1zgTXt1RU5nq9rk1sNpu1LWIL/AOrqgpXVBFiG6gRmyjqeWlpCV+3bg3PyEjjOp3Q5e4KgpDA3W4XP3bsCHc687heL0BscTzLGVjS4XA4eH5+fhtdCS08YhO4zWblTqeTJyXZHtjCSJa/Wo2AiG0AR2yiQc9nzpzB58yZzUVR36NZKUkS+Y4d23hl5XSemDikbWkLxBa/kZvdbn8gSuup3MIlNv+IzfeH19cPVUWC2Ab05IEi8YUL5/MJE77LdTqhy8FYX8fR6QS+YkUVX7GiypueKojY4ng3Dv8JAn+h9bfYkpJsfmVKnhIluz2HW61mrsgSVyG2AZqKColcUWS+aNF8/tRT49tE1/ZXrwOx+TrX8uVL+YoVy9vEpmkKl2WILVZFFvh5ZWZm8uzsbJ6bm9uhzPoiOP81on2L2L5KRQ0GHU9NTeZ5eQ5utVo8/VeD2AZoKprIJUnks2bN5M8++wzX6wUuSWLni4q9stPrBV5Ts5XPmPE0T0gY3G53U4gt9sfTfGUceXl5bUSz2PzH1sxmo+e1SEUHbiqq0wlcNOj48OHlfPXqVTw52cb1eoFrmtpJKqpyQUjkdns2b25u4k5nPiYP4ugGK74ozeFwtAkt2iO2wFl5z/iazDVMHgzwOjZZ4larhS9btoQ//fQ0LgiJXJIMbemlfxqq1wtcpxP4pk0v8nXr1nBR1LelrkhFY19uOTk5PDc3t53UfN9Ho9iSkjxiCxw28XyPMbYBLTZFlbnBoONOZx7fsGE9Hz9+HJdlqW0iQZY9nSMhYTCXJJFXVS3jBw7s45mZ6VwU9Vh5ECfbDPmnnv5C60k66v9cMHLrzeSBwaD3E5sVKw8gto5TUZ+89HqBu92FfO3a1XzBgvm8pGQYT09P5UlJVp6Zmc7Hjh3D6+pq+M6dO3henmdGNXAcDmKLPbFlZ3vuH+ATWW5uLnc4HFErNr1e365AFysPILZuty3S6wWekZHGp0+fxlevXsXXrl3N169/gW/dWs1ra2v47NmzuNVq6bSIF2KLvd04HA5Hm8h8RLPYDAaDn9iwpApi6zAVTXxgLE2SDNxg0HGLxcTt9hzuchVwuz2HG41a2/hbZ3tiQWyxs84zUGqBj6NVbLIsc6PRyJOTk7mmaUhFIbYOIjbhq4gtMK0URT3X6QQuCIlcpxPaCa2zOjeILfrH03xS8+ETWkeRW6DYejqJ0J3kOirY7anYfP21J3eDh9iQimJr8AFATk4OdzgcMS42bA0OsUFswCs0f4lBbBAbxAaxxXxtmr/MAuUGsUFsEBvEFhMrCHzt7x+ZdUVXcuuupq2zhfGdbTzZ2SaUEBuA2EC3UZpPWBAbxAaxQWxxUcYRLBAbxAaxQWxRH6lBbBAbxAaxxbzQsrOzey21riTXU7mFYnF8YWEhT0tLizOxJX0ltsLCQoitl2LLyvKKzWaC2AbQvml2ux1ii16xmSgtLZUKCwvJ5XKBIPC12dChmWS2mMiWBLHFs9T8ozR/ILYoTEWtVhOlpiaTw+Gg3FwQDA6HnXJzcykzM52sVhPZELHFferpozO59UV03Y25hUNwHrGlxpfYbEkmstnMZLGYyWazkdVqIavVDHqIp92snja0mpGKxvm9CXxCiwex+Rfqxp/YbEayWk1ksZijUmo2W/SLtu0cbWbvHwmILR7LOfxlBrHFwBhbrERHNpulbeYxmoUHscVn6hkIxAax9Qqz2UiappCqyqRpCmmaQkaj2iY3iA1iC3eEFozYQjWRECi2UAmuqwmEuJwVjUY5qKpMBoOOUlKSyOUqoLKyEioqclFaWgqJop4URYLYILZ+idQgtqgWWzqpqkxJSdEnBkkyUHKyjZYsWURnzpymS5feoEuX3qCLFy/Q2bMv0Zo1qyg7eyiJoj5qU2ZFkWlbXS0dOdwMscWh1CC2aBTbuXP3MzIySNOUqBurUhSJXK4Cevnlc3T9egutW7eGxo4dQyUlw2jkyOG0cOF8OnfuDF28eIFGjx5JsixGacSpUN32bXT02DE/sc2A2KJ81tN/9hNiizGxNTYdup+WnkYmk0o2mzVqohxNU8jhyKGLFy/Q6dMnKS/PQYKQQAaDjkRRTwaDjgQhgZKSrFRdvYmuX2+hkpJh0RW5ef9QGDWF1m3YTNt27WsT22JEbFFbdNsZfYneQiU3f7F1tW9bbycS4kZsm7fvvp+enk4mTSZrlIjNbDaSoki0Z88uunDhNUpNTSZR1JPFYiKbzUJJSdZ242+yLNK2bbV04sQxSkqykqYpUSM2s9VERqNKS1euodWbd0BsEBvEFgmx1e3cfz/bnk1GzeBdeRAd42olJcPoxo3rNHHiUyRJhnZpsv9ji8VEkmQghyOHXn31ZZo2bUrURG0Wi4UsVhNZLBqtXLOB1m6uhdggNogtEmI7cebc/bKKEhIlXdSkogaDjhYtWkAnTx6ntLQUMpuNXZZ1mEwaKYpEW7Zspg0bXiBVlclsNkZBSm0lk0mltLQk2r//EO1q3NsmtiVzZ77Z2Lj3jsPh4IIuEWKD2OJWbKomcUkSudVqiZzY3rr51hfPPDuTDKKOLBZLVKShkmSg6upNVFdX400rTd3Wq4minubNe462batte5/+l7SFNE0ml7uAWq600NHDTb9omzyYM+PNfXv333E6nVwQhoSuE0FsYZlA6O1kgv/jUC+O705sXUku8Of+cgt1ga6qSlyS9DwlJenulkiJ7ZVz535ZU7uVFE0kk0mOCrHJskgvvrietmzZTJqmeKVm6bJWTJIMNHv2LNq6tZpsNkt0iM1mIUnW08yZM+hPv/cubdmw+r2vxFb55qFDh+6UlZV5xKZBbBBb/IlNU2WuaRIXRR3Pzsm+u2P7tsiIrbb6xfdefvkVys93kCgbyOpdqtRfFf0Wi4lk2UDz58+n3bt3U3JyMpnNHa9d9d/MUVEkWrFiOT3//ArSNKVfxeY7L7PZSCaTQjt376G3b934w9jRZae/SkUrrxw/cezuxEkTuZCIiA1ii+OITZO4Xi/w8vKyuw17dv04ImIryHccutZy5XdLliwkg6j37CPmtw6zP5BlkcrLy+nIkaNUXl5Osix3WGPn+5mmKZSRkUa7d++kSZMmkCyL/Spmm3cBvCjq6IknRtOVqy106nhT69e//kidr90njhtx5uSJY3zZ8uWtsuwZg/AXE8QGscWD2Dx9WeIGg8CfefbZT7ZuqX4vImJ76Gtfq2na3/CTV145T4WFTo8U/KKO/klHNTKbTbRx4yaqra0li+XBEg5f6YfJpJEsizRv3nO0Y8c2Sk9P7fdyD18dntVqpIa9e+ntmzf/MHHsyLP+7Z6YMLj+0N6Gn+7a1dA6NCuTG/SCJ3TXFERsUS63QIFFunC3p4vj/R/3dBLBM3kQyohN4ZIscovZ2Lq5euvtKZMmvxIRsTHGaqZOnnD+xlvX7m/fvr2toLQnA/bhrtYvLCygpqYmWrXqeUpJSSJFkchoVNtQFInMZiNVVk6n5uaDNHLkcJIkQ0TP2ydYm1doNpuZLN4JkAUL5tLb736PXjv/0q/9ozXGWM2gQYNqn186/8ZLp09/OmnyFK7TCUhFIbb4E5smc0EYwkeNHHFn//79HyUnWfdFTGyMsZplixdce+fW92j58ipSVcWzKD5gHCvSY1SaplBZWQk1Nu6hnTt30IQJ36WCgnzKzh5Kubl2GjNmNK1fv472799L48Y9SYoitYmmX1JQq5nMZpVEg0Djxo2lqy3X6e2bb/1X1aJnr3bU5k+OLDt17EjT7e31u1pTUpK4waDjmqYiFYXY4kZsBoOOayaZb9y48e66tWvffehrX6uJqNgSE4bsbG7a99GNt2/R4qXLSDNqJIs6snonEiIpNp+YPDtjSJSTk0WLFi2gvXsbaN++Rqqv306NjXto794GWrVqJRUWOklV5X5NPZOSrGQ0qmQw6Gj8+PH0+sWLdPOta/9Ztei5t7pq9zUrl7xz5uz5v5/73HNcrxO4LItc02Su9iElVRSZWyyWtosrKwv0hp7IyrfnWrAC80mpM1l1Rle35OvpvQ26Wifquf1e3+vYNE3hsizxIQnf4VOmTLxz+PDRn9vt2U1BeqnvYmOM1Rj0ul2Hm/d9dPOdd2nT5i00NDOddLpEMhrVyIrCF7V5oy+jUSVVlWjo0AyqKC+lsWPH0MiRw8nhyCGjUW0bU+uPaM1TWmIiUdSR2aTRvLlz6fLVFrp1863/Wrlk7o3u2nz08GEnDx9s/MXx4yfujhkzhgtCAlcUsd1YW/ARnMKtVjPPzEznmZmZPCMD9I4MnpGRwTMzM0NKZ9FgTwuAg93sMphI0G6385SUlD5lDb7fTUwcwocNc7Xubmz8+fRp017thZNCIzZf5Hb04N6fff9P3qMTJ0/R1GmTKTUlmRRZIk1TyWw2ecffjJ5JhrBgIYvVTGZvyYTZaiazxUyKKpNB1JMoGcgg6klRZTKZTZ41mRZTGM/Hn68iWKNRJVk2kMmk0YiRI2nX7j307ve+T997+3qPpObjqTEjzh47eugXBw4evFMxvIILCYO5LEtc05RedzBNU7imqSAsaH1E7eLnoTsvo7HnBJ5HX4dCEhOHcKczj+9p2HNv3do17/TSR6ETG2OsZsjg79Tv37Ptp++8c+u/b9y8SYcOH6J58+dSUZGb0lKTyWLRyGxWyGhUyGjSyGhSQ4vRH63t3zCZNA9GlYwmjUze57763vt6oxr6c/I7N7NZpSSbhQqc+TRt+tNUv3MXXblyhd5991263nLh85WLZrcE2+ZPjR117ujh5l8cbGq+M378OC6Keq7XC1xRJa74RWI9k5qn2lvVJM/vK6AvyHJ7unu+q9f6/46vFMJHqM8zGALfqzezn4oicYNBx/U6gVeUl95paNzzaV1d3Z+rqrInKsTmKwNZ9Fzlm5dfO/XZOzevfPHuu7fo4qU36diJ41S3Yztt2PgivbBhA72wfmCxfv1G2lqzjZoPHaFXL1ygmzdu0Z+88/aXVy+c+9eNa6v+JMlqauxtm3/3yZHnDh9q+vmx4yc/WbhwfmtmZgbX6wUu6ARuEA1cUWSuqApXNIWrmuqNypQHS0S8YtNCuJoBhIYOP68Qv3dH/0bgc529tvNzkzxRod9rFEXmiiJyUdRznV7ggiDw5JQk/uysWZ/sP3Dw9qaNG/5UVeQ9ffBQ6MXmw2ZRG2dNn3hhb33d31x+5fSvr75x/rOWS698dv3ya79pefP131y9/NpvWgYQ1y6//lnLpVc/u/rG+c+uXDj9WVND7YdVC+dcT+6D0PyZMH70ueYDDR+dOP3S3T0NjZ/MeHo6dzhyuKpJXBAGc0E3mAvCEC4IQ3hi4hCekDCEJyQM5kOGgIGOpy98RajfOzHxO1wQvuPph0ICT0xM4IIgcEkSeVbW0NbJkyd/sqN+x73GhsYfT5k44eUQXA/hE5s/acmWfbnZGc252RnNeTlDm/PsQ5tzczIHFt7/v6cNMprC0c72rIymp6dMeG33jpq/PHnmzCeN+w7efWHdutZZs2bx4cNH8kK3mxe63byktJSXlJbw0tJSAHhpaZkfYXj/smG8sMjFnQVuXugexkc/8QSfOXNm65q16+7u2tPY2tjY8DcrVy6/npqasj9E10JkxAYii15I3DV10tjztZvXvXfq2JG/O37iJN+ybeftVRtrb6/fsv323gPNtw8darrd3Nx0u7m5GYAw0nS7+XDz7eranbfXbNh2e93m2tsHmg637mvY8zdrV628Oby89LjJqDaEsP9XM8bYRogg+njooa+F5H0e+6NvbjMZtUaLxbxXVtVGUVYbZUVrNJnMjWYzABHCYmlUVGOjJGuNkqI1WizWfTpB2DVo0KDaMFw/6xljbDVEEl0MGjSoNkwfOAADgVWMMbYADQEAiCMWMMbYFDRE7KahoUpZAYgjpjDGWAkaInZS1ECRQWwAPEApY4zZ0BCxEbE98sjDtR3JDQDQDhtjjD3CGNuExog+sXUUnfkmFTp7DQADnGqv0xhjjM1FgwAA4oC5zO8oRIMAAOKAQn+xPcYY24JGAQDEMFu8Lmt3zEDDAABimErWwWFGwwAAYhgT6+TAJAIAIOYnDQIPDQ0EAIhBNNbNMRmNBACIISazHhzfZoxtQGMBAGKADV5n9ejIRIMBAGKATBbk8SQaDQAQxTzJenEMYozNRuMBAKKQ2V5H9ep4lDG2BI0IAIgiFnvd1KfjMe8boUEBANEgtcdYiI6vM8bmoFEBAP3IHK+LQnoMYoyNReMCAPqBsX0ZU+vJkc5wyz4AQGTY6HVORI5veqdaq9HwAIAwUO11zDdZPxxDGJZgAQBCv0RqCIuCQ2KevZDwoQAAekul1yVRdzzGGHN5Zy+wIy8AoCu2eF3hYiEs4Qj38Qjz3AZrGGPsu4yxhYyxZfgwARiQLPM64LteJ9iY392kQn38zwAwl6yI53TZXwAAAABJRU5ErkJggg==";
                break;
        }
    },

    changeScreen:function(){
        switch (this.changeType){
            case this.H_TO_V:
                this.HtoVFun();
                break;
            case this.V_TO_H:
                this.VtoHFun();
                break;
        }
    },

    HtoVFun:function(){

    },

    VtoHFun:function(){
        var size = cc.view.getFrameSize();
        if(size.width > size.height){
            if(this.isChange) return;
            this.isChange = true;
            var scene = new SunMoon.HtoS();
            scene.initData(size.width, size.height);
            cc.director.pushScene(scene);
        }else{
            if(this.isChange){
                this.isChange = false;
                if(this.isInitChange){
                    this.isInitChange = false;
                    cc.eventManager.dispatchCustomEvent("gameStartLoad");
                }else if(this.isLoaderOver){
                    this.isLoaderOver = false;
                    cc.eventManager.dispatchCustomEvent("gameStartUp");
                }else{
                    cc.director.popScene();
                }
            }
        }
    }
};

SunMoon.HtoS = cc.Scene.extend({
    _backColor:null,
    _sp:null,

    ctor:function(){
        this._super();
    },

    onEnter:function(){
        this._super();
        var size = cc.director.getVisibleSize();
        this._sp = new cc.Sprite("SceneChange.png");
        this._sp.setScale(0.5);
        this._sp.setPosition(size.width * 0.5, size.height * 0.5);
        this._backColor.addChild(this._sp);
    },

    initData:function(w, h){
        this._backColor = new cc.LayerColor(cc.color(0,0,0,255), w, h);
        this.addChild(this._backColor);
    }
});