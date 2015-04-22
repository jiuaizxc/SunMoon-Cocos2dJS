var SMMvc = SMMvc || {};

SMMvc.Facade = cc.Class.extend({
    _controller:null,
    _model:null,
    _view:null,

    ctor:function(){
        if(SMMvc.Facade._instance){cc.assert("Facade is singleton");}
        SMMvc.Facade._instance = this;
        this.initializeFacade();
    },

    initializeFacade:function(){
        this.initializeModel();
        this.initializeController();
        this.initializeView();
    },

    initializeModel:function(){
        if(this._model != null) return;
        this._model = SMMvc.Model.__singleton();
    },

    initializeController:function(){
        if(this._controller != null) return;
        this._controller = SMMvc.Controller.__singleton();
    },

    initializeView:function(){
        if(this._view != null) return;
        this._view = SMMvc.View.__singleton();
    },

    registerCommand:function(notificationName, command){
        this._controller.registerCommand(notificationName, command);
    },

    removeCommand:function(notificationName){
        this._controller.removeCommand(notificationName);
    },

    hasCommand:function(notificationName){
        return this._controller.hasCommand(notificationName);
    },

    registerProxy:function(proxy){
        this._model.registerProxy(proxy);
    },

    retrieveProxy:function(proxyName){
        return this._model.retrieveProxy(proxyName);
    },

    removeProxy:function(proxyName){
        var proxy;
        if(this._model != null) proxy = this._model.removeProxy(proxyName);
        return proxy;
    },

    hasProxy:function(proxyName){
        return this._model.hasProxy(proxyName);
    },

    registerMediator:function(mediator){
        if(this._view != null) this._view.registerMediator(mediator);
    },

    retrieveMediator:function(mediatorName){
        return this._view.retrieveMediator(mediatorName);
    },

    removeMediator:function(mediatorName){
        var mediator;
        if(this._view != null) mediator = this._view.removeMediator(mediatorName);
        return mediator;
    },

    hasMediator:function(mediatorName){
        return this._view.hasMediator(mediatorName);
    },

    sendNotification:function(notificationName, body, type){
        this.notifyObservers(new SMMvc.Notification(notificationName, body, type));
    },

    notifyObservers:function(notification){
        if(this._view != null) this._view.notifyObservers(notification);
    }
});
SMMvc.Facade._instance = null;

SMMvc.Controller = cc.Class.extend({
    _commandMap:null,
    _view:null,


    ctor:function(){
        if(SMMvc.Controller._instance){cc.assert("Controller is Null");}
        SMMvc.Controller._instance = this;
        this._commandMap = {};
        this.initializeController();
    },

    initializeController:function(){
        this._view = SMMvc.View.__singleton();
    },

    executeCommand:function(note){
        var commandClassRef = this._commandMap[note.getName()];
        if(commandClassRef == null) return;
        var command = new commandClassRef();
        command.execute(note);
    },

    registerCommand:function(notificationName, command){
        if(this._commandMap[notificationName] == null){
            this._view.registerObserver(notificationName, new SMMvc.Observer(this.executeCommand, this));
        }
        this._commandMap[notificationName] = command;
    },

    hasCommand:function(notificationName){
        return this._commandMap[notificationName] != null;
    },

    removeCommand:function(notificationName){
        if(this.hasCommand(notificationName)){
            this._view.removeObserver(notificationName, this);
            delete this._commandMap[notificationName];
        }
    }
});

SMMvc.Controller._instance = null;
SMMvc.Controller.__singleton = function(){
    if(SMMvc.Controller._instance == null) new SMMvc.Controller();
    return SMMvc.Controller._instance;
};

SMMvc.Model = cc.Class.extend({
    _proxyMap:null,

    ctor:function(){
        if(SMMvc.Model._instance){cc.assert("Model is Null");}
        SMMvc.Model._instance = this;
        this._proxyMap = {};
        this.initializeModel();
    },

    initializeModel:function(){},

    registerProxy:function(proxy){
        this._proxyMap[proxy.getProxyName()] = proxy;
        proxy.onRegister();
    },

    retrieveProxy:function(proxyName){
        return this._proxyMap[proxyName];
    },

    hasProxy:function(proxyName){
        return this._proxyMap[proxyName] != null;
    },

    removeProxy:function(proxyName){
        var proxy = this._proxyMap[proxyName];
        if(proxy){
            delete this._proxyMap[proxyName];
            proxy.onRemove();
        }
        return proxy;
    }
});

SMMvc.Model._instance = null;
SMMvc.Model.__singleton = function(){
    if(SMMvc.Model._instance == null) new SMMvc.Model();
    return SMMvc.Model._instance;
};

SMMvc.View = cc.Class.extend({
    _mediatorMap:null,
    _observerMap:null,

    ctor:function(){
        if(SMMvc.View._instance){cc.assert("View is Null");}
        SMMvc.View._instance = this;
        this._mediatorMap = {};
        this._observerMap = {};
        this.initializeView();
    },

    initializeView:function(){},

    registerObserver:function(notificationName, observer){
        var observers = this._observerMap[notificationName];
        if(observers){
            observers.push(observer);
        }else{
            this._observerMap[notificationName] = [observer];
        }
    },

    notifyObservers:function(notification){
        if(this._observerMap[notification.getName()] != null ){
            var observers_ref = this._observerMap[notification.getName()];

            var observers = [];
            var observer;
            for(var i = 0; i < observers_ref.length; i++) {
                observer = observers_ref[i];
                observers.push(observer);
            }

            for(i = 0; i < observers.length; i++) {
                observer = observers[i];
                observer.notifyObserver(notification);
            }
        }
    },

    removeObserver:function(notificationName, notifyContext){
        var observers = this._observerMap[notificationName];

        for(var i = 0; i<observers.length; i++){
            if(observers[i].compareNotifyContext(notifyContext) == true ){
                observers.splice(i,1);
                break;
            }
        }

        if(observers.length == 0 ){
            delete this._observerMap[notificationName];
        }
    },

    registerMediator:function(mediator){
        if(this._mediatorMap[mediator.getMediatorName()] != null ) return;
        this._mediatorMap[mediator.getMediatorName()] = mediator;

        var interests = mediator.listNotificationInterests();

        if(interests.length > 0){
            var observer = new SMMvc.Observer(mediator.handleNotification, mediator);
            for( var i = 0;  i < interests.length; i++){
                this.registerObserver(interests[i],  observer);
            }
        }
        mediator.onRegister();
    },

    retrieveMediator:function(mediatorName){
        return this._mediatorMap[mediatorName];
    },

    removeMediator:function(mediatorName){
        var mediator = this._mediatorMap[mediatorName];
        if(mediator){
            var interests = mediator.listNotificationInterests();
            for(var i = 0; i<interests.length; i++){
                this.removeObserver(interests[i], mediator);
            }
            delete this._mediatorMap[ mediatorName ];
            mediator.onRemove();
        }
        return mediator;
    },

    hasMediator:function(mediatorName){
        return this._mediatorMap[mediatorName] != null;
    }
});

SMMvc.View._instance = null;
SMMvc.View.__singleton = function(){
    if(SMMvc.View._instance == null) new SMMvc.View();
    return SMMvc.View._instance;
};

SMMvc.Observer = cc.Class.extend({
    _notify:null,
    _context:null,

    ctor:function(notifyMethod, notifyContext){
        this.setNotifyMethod(notifyMethod);
        this.setNotifyContext(notifyContext);
    },

    setNotifyMethod:function(notifyMethod){
        this._notify = notifyMethod;
    },

    setNotifyContext:function(notifyContext){
        this._context = notifyContext;
    },

    getNotifyMethod:function(){
        return this._notify;
    },

    getNotifyContext:function(){
        return this._context;
    },

    notifyObserver:function(notification){
        this.getNotifyMethod().apply(this.getNotifyContext(), [notification]);
    },

    compareNotifyContext:function(object){
        return object === this._context;
    }
});

SMMvc.Notification = cc.Class.extend({
    _name:null,
    _body:null,
    _type:null,

    ctor:function(name, body, type){
        if(body === undefined){body = null;}
        if(type === undefined){type = null;}

        this._name = name;
        this._body = body;
        this._type = type;
    },

    getName:function(){
        return this._name;
    },

    setBody:function(body){
        this._body = body;
    },

    getBody:function(){
        return this._body;
    },

    setType:function(type){
        this._type = type;
    },

    getType:function(){
        return this._type;
    }
});

SMMvc.SimpleCommand = cc.Class.extend({
    _facade:null,

    ctor:function(){
        this._facade = SMMvc.Facade._instance;
    },

    execute:function(notification){

    },

    sendNotification:function(notificationName, body, type){
        this._facade.sendNotification(notificationName, body, type);
    }
});

SMMvc.Mediator = cc.Class.extend({
    _facade:null,
    _mediatorName:null,
    _viewComponent:null,

    ctor:function(mediatorName, viewComponent){
        if(mediatorName === undefined || mediatorName == null){cc.assert("mediatorName is Null");}
        if(viewComponent === undefined || viewComponent == null){cc.assert("viewComponent is Null");}

        this._mediatorName = mediatorName;
        this._viewComponent = viewComponent;

        this._facade = SMMvc.Facade._instance;
    },

    getMediatorName:function(){
        return this._mediatorName;
    },

    setViewComponent:function(viewComponent){
        this._viewComponent = viewComponent;
    },

    getViewComponent:function(){
        return this._viewComponent;
    },

    listNotificationInterests:function(){
        return [];
    },

    handleNotification:function(notification){},

    onRegister:function(){},

    onRemove:function(){},

    sendNotification:function(notificationName, body, type){
        this._facade.sendNotification(notificationName, body, type);
    }
});

SMMvc.Proxy = cc.Class.extend({
    _facade:null,
    _proxyName:null,
    _data:null,

    ctor:function(proxyName, data){
        if(proxyName === undefined || proxyName == null){cc.assert("proxyName is Null");}
        if(data === undefined || data == null){cc.assert("data is Null");}

        this._proxyName = proxyName;
        this._data = data;
        this._facade = SMMvc.Facade._instance;
    },

    getProxyName:function(){
        return this._proxyName;
    },


    setData:function(data){
        this._data = data;
    },


    getData:function(){
        return this._data;
    },

    onRegister:function(){},

    onRemove:function(){},

    sendNotification:function(notificationName, body, type){
        this._facade.sendNotification(notificationName, body, type);
    }
});