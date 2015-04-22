/**
 * Created by AcoolGame-01 on 2015/3/20.
 */
var SunMoon = SunMoon || {};

SunMoon.ECSManager = cc.Class.extend({
    _entities:null,

    _ComEntities:null,

    _lowestUnassignedEid:0,

    __beAdding:null,
    __beRemoving:null,
    __handing:null,

    __unuseSystems:null,
    __unuseComs:null,

    ctor:function(){
        this._entities = [];
        this._ComEntities = {};

        this._lowestUnassignedEid = 1;

        this.__beAdding = [];
        this.__beRemoving = [];
        this.__unuseSystems = [];
        this.__unuseComs = {};
    },

    /**
     * 创建Entity的唯一入口
     */
    createEntity:function(filename){
        if(filename === undefined){
            return this.__createEntityID();
        }else{
            return this.__createEntityFile(filename);
        }
    },

    removeEntity:function(entity){
        if(entity == null){
            return;
        }

        entity.__beMoving = true;

        //2,加入待移除列表(不能立即移除)
        this.__beRemoving.push(entity);
    },

    /**
     * 游戏运行中将Com添加到一个Entity游戏对象
     *
     * 1,将Com添加到Entity
     * 2,从__unusedSystem查找哪些System会处理此类型，并将System附加到Entity
     * 3,对Entity所有的System触发onComsChanged事件，参见: System::onComsChanged()
     */
    addComToEntity:function(com, entity){
        if(com == null || entity == null){
            return;
        }

        //1, 每个类型的Com只能有一个实例
        if(entity._components[com.getType()]!= null){
            return;
        }

        entity._components[com.getType()] = com;
        com._ownEntity = entity;

        //2. auto-attach System
        this.__autoAttachingSystem(com.getType(), entity);
    },

    /**
     * 移除Entity某个类型的Com
     *
     * 1，移除并销毁Com对象
     * 2，对所有System执行onComsChanged事件
     * 3，对需要移除的Syetm执行 onAttached事件
     * 4, 移除并销毁System对象
     */
    removeComFromEntity:function(comId, Entity){},

    /**
     * 所有Entity并不会被排序，但是每个Entity的System会被按优先级执行
     * 参见: _entitySystems
     */
    update:function(dt){
        //1， 加入上一帧或者其他地方待加入的游戏对象
        this.__addingEntities();

        //2,更新游戏对象
        var entity;
        var key;
        var sys;
        for(var i = 0, len = this._entities.length; i < len; i ++){
            entity = this._entities[i];
            if(entity.__beMoving) break;
            for(key in entity._systems){
                sys = entity._systems[key];
                if(!sys._isFree){
                    sys.update(dt);
                    if(entity.__beMoving) break;
                }
            }
        }

        //3，移除游戏对象
        this.__removingEntities();

        //to do：向Statistics统计执行时间
    },

    registerSystem:function(system){
        this.__unuseSystems.push(system);
        this.__unuseSystems.sort(this.sysSort);
    },

    sysSort:function(a, b){
        return a - b;
    },

    unregisterSystem:function(typeName){
        var len = this.__unuseSystems.length;
        while(--len >= 0){
            if(this.__unuseSystems[len].getType() == typeName){
                this.__unuseSystems.split(len, 1);
            }
        }
    },

    createCom:function(typeName){
        var com = this.__unuseComs[typeName];
        if(com != null){
            return com.cloneEmpty();
        }
        return null;
    },

    registerCom:function(com){
        var name = com.getType();
        if(this.__unuseComs[name] == null){
            this.__unuseComs[name] = com;
        }
    },

    unregisterCom:function(typeName){
        if(this.__unuseComs[typeName] != null){
            delete this.__unuseComs[typeName];
        }
    },

    generateNewEid:function(){
        if (this._lowestUnassignedEid < Number.MAX_VALUE){
            return this._lowestUnassignedEid ++;
        }
        return 0;
    },

    getAllEntitiesPosessingCom:function(comType){
        if(comType == null) return null;
        return this._ComEntities[comType];
    },

    __createEntityID:function(){
        var id = this.generateNewEid();
        var entity = SunMoon.Entity.createWithId(id);

        //任何时候，新加一个Entity添加到__beAdding数组中
        this.__beAdding.push(entity);
        return entity;
    },

    //从配置文件创建游戏对象
    __createEntityFile:function(filename){
        var data = cc.loader.getRes(filename);
        var key;
        var comValue;
        if(data != null){
            var entity = this.__createEntityID();

            cc.log("Created Entity: %d with filename: %s", entity.getID(), filename);

            var count = data.length;
            for (var i = 0; i < count; i++){
                comValue = data[i];
                var com = this.__unuseComs[comValue["type"]];
                if(com){
                    com = com.cloneEmpty();
                    com.initWithMap(comValue);
                    this.addComToEntity(com, entity);
                }
            }

            entity.setComData(data);
            return entity;
        }

        return null;
    },

    __findEntity:function(entities, id){
        var len = entities.length;
        while(--len >= 0){
            if (entities[len].getID() == id) {
                return true;
            }
        }
        return false;
    },

    __autoAttachingSystem:function(comType, entity){
        var i = 0;
        var len = this.__unuseSystems.length;
        var sys;
        for(i; i < len; i++){
            sys = this.__unuseSystems[i];
            if(sys.getComType() == comType){
                if(entity._systems[sys.getType()] == null){
                    var newSystem = sys.cloneEmpty();
                    entity._systems[sys.getType()] = newSystem;

                    newSystem._isFree = false;
                    newSystem._entityManager = this;
                    newSystem.onInit();
                    newSystem._ownEntity = entity;
                    newSystem.onAttached();
                }
            }
        }
    },

    __addCompontForIndex:function(Com, entity){
        // 2. 为了便于更快根据Com类型查找entity
        var ComEntities;
        var entities = this._ComEntities[Com.getType()];
        if(entities == null){
            ComEntities = [];
            this._ComEntities[Com.getType()] = ComEntities;
        }else{
            ComEntities = entities;
        }
        ComEntities.unshift(entity);
    },

    __addingEntities:function(){
        if (this.__beAdding.length == 0) return;

        this.__handing = this.__beAdding.concat();
        this.__beAdding.length = 0;

        var i;
        var key;
        var ilen = this.__handing.length;

        var entity;
        for(i = 0; i < ilen; i ++){
            entity = this.__handing[i];

            for(key in entity._components){
                //1，建立组件索引供查找
                this.__addCompontForIndex(entity._components[key], entity);
            }

            //2, 排序
            //(*iter)->sortSystem();

            //3,onComChanged
            entity.ComsChanged();

            //4, 正式加入数组
            this._entities.push(entity);
        }

        this.__handing.length = 0;
    },

    __removingEntities:function(){
        if(this.__beRemoving.length == 0) return;

        this.__handing = this.__beRemoving.concat();
        this.__beRemoving.length = 0;

        var i;
        var key;
        var ilen = this.__handing.length;

        var entity;
        var entities;
        var index;

        //1，清除数据
        for(i = 0; i < ilen; i ++){
            entity = this.__handing[i];

            //1.2,从ECSManager中移除所有Com(此时Coomponent已被移除)
            for(key in entity._components){
                entities = this._ComEntities[key];
                if(entities == null) continue;
                index = entities.indexOf(entity);
                if(index >= 0){
                    entities.splice(index, 1);
                }
            }

            //1.1，移除Entity自身的Coms和Systems
            entity.removeAllComs();
        }

        //2,从_entities集合移除
        for(i = 0; i < ilen; i ++) {
            entity = this.__handing[i];
            index = this._entities.indexOf(entity);
            if (index >= 0) {
                this._entities.splice(index, 1);
            }
        }

        this.__handing.length = 0;
    }
});

SunMoon.Entity = cc.Class.extend({
    _entity_id:0,


    __beMoving:false,
    __jsonData:null,

    _components:null,
    _systems:null,

    ctor:function(){
        this._components = {};
        this._systems = {};
    },

    initWithId:function(id){
        this._entity_id = id;
    },

    setComData:function(data){
        this.__jsonData = data;
    },

    getID:function(){
        return this._entity_id;
    },

    removeCom:function(type){
        var com = this.getComByType(type);
        if(com){
            //1，移除对应的System
            var sys;
            for(var key in this._systems){
                sys = this._systems[key];
                if(sys.getComType() == type){
                    sys.onDeattached();
                    delete this._systems[key];
                }
            }

            //2,移除Com
            com.clearCom();
            delete this._components[com.getType()];
        }
    },

    removeAllComs:function(){
        for(var key in this._components) {
            this.removeCom(key);
        }
    },

    ComsChanged:function(){
        for(var key in this._systems){
            this._systems[key].onComsChanged();
        }
    },

    getComByType:function(type){
        return this._components[type];
    },

    getNode:function(){
        var node = this.getComByType(NodeCom.TYPE);
        if(node != null){
            return node._node;
        }
        return null;
    }
});

SunMoon.Entity.createWithId = function(id){
    var entity = new SunMoon.Entity();
    entity.initWithId(id);
    return entity;
};

SunMoon.Component = cc.Class.extend({
    _com_type:null,

    _ownEntity:null,

    ctor:function(type){
        this._com_type = type;
    },

    cloneEmpty:function(){
        return null;
    },

    getType:function(){
        return this._com_type;
    },

    getEntity:function(){
        return this._ownEntity;
    },

    clearCom:function(){

    },

    initWithMap:function(obj){

    },

    initWithJson:function(str){

    }
});

/**
 * @class
 * @extends cc.Class
 *
 * @property {SunMoon.Entity}               _ownEntity
 *
 */
SunMoon.System = cc.Class.extend({
    _sys_type:null,
    _com_type:null,
    _ownEntity:null,
    _priority:0,

    _entityManager:null,
    _isFree:false,

    _touchEnabled:false,
    _accelerometerEnabled:false,
    _keyboardEnabled:false,
    _touchListener:null,
    _keyboardListener:null,
    _accelerationListener:null,

    _touchMode:null,
    _swallowsTouches:false,

    ctor:function(type, comType, priority){
        if(priority === undefined){priority = 0;}
        this._sys_type = type;
        this._com_type = comType;
        this._priority = priority;
        this._isFree = true;
    },

    cloneEmpty:function(){
        return null;
    },

    getECSManager:function(){
        return this._entityManager;
    },

    getPriority:function(){
        return this._priority;
    },

    getType:function(){
        return this._sys_type;
    },

    getComType:function(){
        return this._com_type;
    },

    getNode:function(){
        if(this._ownEntity != null){
            return this._ownEntity.getNode();
        }
        return null;
    },

    getEntity:function(){
        return this._ownEntity;
    },

    /**
     * 通过组建类型来获取组件
     * @param {String} 组件类型
     */
    getComByType:function(comType){
        if(this._ownEntity != null){
            return this._ownEntity.getComByType(comType);
        }
        return null;
    },

    /**
     * 模拟初始化,System实际上是被复制的，所以该方法不一定是在对象被构造之后
     * 该方法在每次被attach之前总会执行
     */
    onInit:function(){

    },

    /**
     * 被附加到一个Entity时触发
     * 这里可以执行事件订阅等事情，这里可以调用getNode，如果存在的话(NodeCom会始终被第一个附加)
     */
    onAttached:function(){},

    onDeattached:function(){},

    /**
     * Entity有组件发生变动时触发
     *
     * System应该始终在这个时候获取需要使用的Com的引用，以减少每帧查找Com
     */
    onComsChanged:function(){},

    update:function(dt){},

    isTouchEnabled:function(){
        return this._touchEnabled;
    },

    setTouchEnabled:function(value){
        if(this._touchEnabled != value){
            this._touchEnabled = value;
            if(value){
                if(this._touchListener != null) return;

                var listener;
                if(this._touchMode == cc.EventListener.TOUCH_ALL_AT_ONCE){
                    listener = cc.EventListener.create({
                        event:cc.EventListener.TOUCH_ALL_AT_ONCE,
                        onTouchBegan:this.onTouchBegan,
                        onTouchMoved:this.onTouchMoved,
                        onTouchEnded:this.onTouchEnded,
                        onTouchesCancelled:this.onTouchesCancelled
                    });
                }else{
                    listener = cc.EventListener.create({
                        event:cc.EventListener.TOUCH_ONE_BY_ONE,
                        swallowTouches:this._swallowsTouches,
                        onTouchBegan:this.onTouchBegan,
                        onTouchMoved:this.onTouchMoved,
                        onTouchEnded:this.onTouchEnded,
                        onTouchesCancelled:this.onTouchesCancelled
                    });
                }
                this._touchListener = listener;
                cc.eventManager.addListener(listener, this.getNode());
            }else{
                cc.eventManager.removeListener(this._touchListener);
                this._touchListener = null;
            }
        }
    },

    setTouchMode:function(mode){
        if(this._touchMode != mode){
            this._touchMode = mode;
            if(this._touchEnabled){
                this.setTouchEnabled(false);
                this.setTouchEnabled(true);
            }
        }
    },

    getTouchMode:function(){
        return this._touchMode;
    },

    setSwallowsTouches:function(swallowsTouches){
        if(this._swallowsTouches != swallowsTouches){
            this._swallowsTouches = swallowsTouches;

            if(this._touchEnabled){
                this.setTouchEnabled(false);
                this.setTouchEnabled(true);
            }
        }
    },

    isSwallowsTouches:function(){
        return this._swallowsTouches;
    },

    onTouchBegan:function(touch, event){return true;},
    onTouchMoved:function(touch, event){},
    onTouchEnded:function(touch, event){},
    onTouchCancelled:function(touch, event){},

    onTouchesBegan:function(touches, event){},
    onTouchesMoved:function(touches, event){},
    onTouchesEnded:function(touches, event){},
    onTouchesCancelled:function(touches, event){}
});

var NodeCom = SunMoon.Component.extend({
    _node:null,
    _action:null,

    ctor:function(){
        this._super(NodeCom.TYPE);
    },

    cloneEmpty:function(){
        return new NodeCom();
    },

    clearCom:function(){
        if(this._node){
            this._node.removeFromParent();
            this._node.release();
        }
        if(this._action) this._action.release();
    },

    initWithMap:function(obj) {
        if(obj["UI"]) this.initCocosUI(obj["UI"]);
        else if(obj["DragonBone"]) this.initDragongBone(obj["DragonBone"]);
        else if(obj["Sprite"]) this.initSprite(obj["Sprite"]);
        else if(obj["Node"])  this.initNode(obj["Node"]);
    },

    initCocosUI:function(obj){
    	this._node = ccs.load(obj["fileName"]).node;
    	this._node.retain();
        if(obj["adaptation"]){
            this._node.setContentSize(cc.director.getVisibleSize());
            ccui.helper.doLayout(this._node);
        }

        this._action = ccs.load(obj["fileName"]).action;
        if(this._action){
        	this._action.retain();
        	this._action.pause();
        }
    },

    /**
     * @param {Object}
     */
    initDragongBone:function(obj){
        this._node = dragonBones.DBCCFactory.singleton().buildArmatureNode(obj["armatureName"],
            obj["skinName"], obj["animationName"], obj["dragonBonesName"], obj["textureAtlasName"]);
        this._node.retain();
        //坐标等其他属性的设置
    },

    initSprite:function(obj){
        switch(obj["type"]){
            case "fileName":
                this._node = new cc.Sprite(obj["fileName"]);
                this._node.retain();
                break;
        }
    },

    initNode:function(obj){
        this._node = new cc.Node();
    }

});

NodeCom.TYPE = "NodeCom";

var NodeSys = SunMoon.System.extend({
    ctor:function(){
        this._super(NodeSys.TYPE, NodeCom.TYPE);
    },

    cloneEmpty:function(){
        return new NodeSys();
    }
});

NodeSys.TYPE = "NodeSys";