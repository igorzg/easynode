'use strict';

let di = require('di-node');
let Type = di.load('typed-js');
let error = di.load('@{en}/error');
let RouteRule = di.load('@{en}/route-rule');
let component = di.load('en/component');
let logger = component.get('en/logger');
/**
 * @function
 * @name list
 * @param {Object} data
 * @description
 * Yield rule item
 */
function* list(data) {
    for (let item of data) {
        yield item;
    }
}
/**
 * @license Mit Licence 2015
 * @since 0.1.0
 * @author Igor Ivanovic
 * @name Router
 *
 * @constructor
 * @description
 * Router handler for easy node
 */
class Router extends Type {
    constructor(config) {
        super({
            routes: Type.OBJECT,
            methods: Type.ARRAY,
            errorRoute: Type.STRING
        });
        if (!Type.isObject(config)) {
            config = {};
        }
        this.routes = new Set();
        this.errorRoute = config.errorRoute || 'error/handler';
        this.methods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH'];

        if (Type.isObject(config) && !!config.useCustomErrorHandler) {
            this.add(Object.assign({
                url: '/error',
                route: 'error/handler',
                methods: this.methods
            }, config));
        }

        logger.info('Router.constructor', {
            config: config,
            instance: this
        });
    }

    /**
     * @since 0.1.0
     * @author Igor Ivanovic
     * @function
     * @name Router#add
     * @param {Object|Array} rule
     *
     * @description
     * Add route to resolve list
     */
    add(rule) {
        if (Type.isArray(rule)) {
            return rule.forEach(item => this.add(item));
        } else if (Type.isObject(rule) && !(rule instanceof RouteRule)) {
            return this.add(new RouteRule(rule));
        }

        if (!(rule instanceof RouteRule)) {
            throw new error.HttpException(500, 'rule must be instance of RouteRule class', {
                rule: rule
            });
        }

        logger.info('Router.add', rule);
        this.routes.add(rule);
    }

    /**
     * @since 0.1.0
     * @author Igor Ivanovic
     * @function
     * @name Router#parseRequest
     * @param {String} pathName
     * @param {String} method
     *
     * @description
     * Parse request based on pathName and method
     */
    parseRequest(pathName, method) {
        let routes = list(this.routes);
        let promises = new Set();
        for (let route of routes) {
            let parsedRequest = route.parseRequest(pathName, method);
            if (!!parsedRequest) {
                promises.add(parsedRequest);
            }
        }
        return Promise.all(promises).then(values => {

            while (values.length > 0) {
                let value = values.shift();
                if (!!value) {
                    return value;
                }
            }

            throw new error.HttpException(404, 'Router.parseRequest: no request found', {
                pathName,
                method
            });
        });
    }

    /**
     * @since 0.1.0
     * @author Igor Ivanovic
     * @function
     * @name Router#createUrl
     * @param {String} routeName
     * @param {Object} params
     *
     * @description
     * Create url based on route and params
     */
    createUrl(routeName, params) {
        let routes = list(this.routes);
        let promises = new Set();
        for (let route of routes) {
            let parsedRequest = route.createUrl(routeName, params);
            if (!!parsedRequest) {
                promises.add(parsedRequest);
            }
        }
        return Promise.all(promises).then(values => {

            while (values.length > 0) {
                let value = values.shift();
                if (!!value) {
                    return value;
                }
            }

            if (params.size > 0) {
                routeName += '?';
                params.forEach((v, k) => {
                    routeName += k + '=' + encodeURIComponent(v);
                });
            }

            return '/' + routeName;
        });
    }
}

module.exports = Router;