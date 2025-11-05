// AI有限状态机
import { Steerings } from './Steerings.js';

// 状态枚举
export const AIState = {
    MOVING: 'moving',      // 正常徘徊
    ALERT: 'alert',        // 警戒（听到枪声）
    FLOCK: 'flock',        // 群体行为
    ATTACK: 'attack',      // 攻击玩家
    IDLING: 'idling'       // 待机
};

export class FiniteStateMachine {
    constructor(entity) {
        this.entity = entity;
        this.currentState = AIState.MOVING;
        this.previousState = null;

        // 状态数据
        this.alertPosition = null;      // 警戒位置（子弹击中位置）
        this.leader = null;              // 跟随的领袖
        this.flockMembers = [];          // 群体成员
        this.maxFlockSize = 5;           // 最大群体大小

        // 徘徊数据
        this.wanderData = {
            angle: Math.random() * Math.PI * 2,
            changeRate: 0.3
        };

        // 计时器
        this.stateTimer = 0;
        this.idleTime = 1.5;

        // 邻居列表（用于分离行为）
        this.neighbors = [];
    }

    /**
     * 更新状态机
     */
    update(deltaTime, playerPosition, enemies, bullets) {
        this.stateTimer += deltaTime;

        // 更新邻居列表
        this.updateNeighbors(enemies);

        // 根据当前状态执行行为
        switch (this.currentState) {
            case AIState.MOVING:
                this.updateMoving(deltaTime);
                break;
            case AIState.ALERT:
                this.updateAlert(deltaTime);
                break;
            case AIState.FLOCK:
                this.updateFlock(deltaTime);
                break;
            case AIState.ATTACK:
                this.updateAttack(deltaTime, playerPosition);
                break;
            case AIState.IDLING:
                this.updateIdling(deltaTime);
                break;
        }

        // 检查状态转换
        this.checkStateTransitions(bullets, enemies, playerPosition);
    }

    /**
     * 更新邻居列表
     */
    updateNeighbors(enemies) {
        this.neighbors = [];
        const neighborRadius = 5;

        for (const enemy of enemies) {
            if (enemy !== this.entity && enemy.isAlive) {
                const distance = this.entity.position.distanceTo(enemy.position);
                if (distance < neighborRadius) {
                    this.neighbors.push(enemy);
                }
            }
        }
    }

    /**
     * 检查状态转换
     */
    checkStateTransitions(bullets, enemies, playerPosition) {
        // 检查是否被子弹击中附近
        for (const bullet of bullets) {
            const distance = this.entity.position.distanceTo(bullet.position);
            if (distance < 8) {
                // 如果是领袖，进入攻击状态
                if (this.entity.isLeader) {
                    this.changeState(AIState.ATTACK);
                } else {
                    // 普通敌人进入警戒状态
                    this.alertPosition = bullet.position.clone();
                    this.changeState(AIState.ALERT);
                }
            }
        }

        // 检查是否接近领袖（群体行为）
        if (!this.entity.isLeader && this.currentState === AIState.MOVING) {
            for (const enemy of enemies) {
                if (enemy.isLeader && enemy.isAlive) {
                    const distance = this.entity.position.distanceTo(enemy.position);
                    if (distance < 10 && enemy.fsm.flockMembers.length < this.maxFlockSize) {
                        this.leader = enemy;
                        enemy.fsm.flockMembers.push(this.entity);
                        this.changeState(AIState.FLOCK);
                        break;
                    }
                }
            }
        }

        // 警戒状态超时，返回移动状态
        if (this.currentState === AIState.ALERT && this.stateTimer > 5) {
            this.changeState(AIState.MOVING);
        }

        // 群体成员检查领袖是否还存在
        if (this.currentState === AIState.FLOCK) {
            if (!this.leader || !this.leader.isAlive) {
                this.changeState(AIState.IDLING);
            }
        }
    }

    /**
     * 改变状态
     */
    changeState(newState) {
        if (this.currentState !== newState) {
            this.previousState = this.currentState;
            this.currentState = newState;
            this.stateTimer = 0;

            // 状态进入时的处理
            this.onStateEnter(newState);
        }
    }

    /**
     * 状态进入处理
     */
    onStateEnter(state) {
        switch (state) {
            case AIState.MOVING:
                this.alertPosition = null;
                this.leader = null;
                break;
            case AIState.ALERT:
                // 解散群体
                if (this.leader) {
                    this.leaveFlc();
                }
                break;
            case AIState.FLOCK:
                break;
            case AIState.ATTACK:
                break;
            case AIState.IDLING:
                this.leaveFlockIfNeeded();
                break;
        }
    }

    /**
     * 离开群体
     */
    leaveFlock() {
        if (this.leader) {
            const index = this.leader.fsm.flockMembers.indexOf(this.entity);
            if (index > -1) {
                this.leader.fsm.flockMembers.splice(index, 1);
            }
            this.leader = null;
        }
    }

    /**
     * 如果需要则离开群体
     */
    leaveFlockIfNeeded() {
        if (this.currentState === AIState.FLOCK) {
            this.leaveFlock();
        }
    }

    /**
     * 更新移动状态
     */
    updateMoving(deltaTime) {
        const entity = this.entity;
        let steeringForce = new THREE.Vector3(0, 0, 0);

        // 徘徊行为
        const wanderForce = Steerings.Wander(entity.forward, this.wanderData);
        steeringForce.add(wanderForce.multiplyScalar(1.0));

        // 避障行为
        const avoidForce = Steerings.Avoid(
            entity.position,
            entity.velocity,
            entity.forward,
            entity.right,
            entity.obstacles,
            5
        );
        steeringForce.add(avoidForce.multiplyScalar(2.0));

        // 分离行为（与邻居保持距离）
        if (this.neighbors.length > 0) {
            const separateForce = Steerings.Separate(entity.position, this.neighbors, 3);
            steeringForce.add(separateForce.multiplyScalar(0.5));
        }

        entity.applySteeringForce(steeringForce);
    }

    /**
     * 更新警戒状态
     */
    updateAlert(deltaTime) {
        const entity = this.entity;
        let steeringForce = new THREE.Vector3(0, 0, 0);

        // 逃避子弹击中位置
        if (this.alertPosition) {
            const evadeForce = Steerings.Evade(entity.position, this.alertPosition, 10);
            steeringForce.add(evadeForce.multiplyScalar(1.5));
        }

        // 避障行为
        const avoidForce = Steerings.Avoid(
            entity.position,
            entity.velocity,
            entity.forward,
            entity.right,
            entity.obstacles,
            5
        );
        steeringForce.add(avoidForce.multiplyScalar(2.0));

        entity.applySteeringForce(steeringForce);
    }

    /**
     * 更新群体状态
     */
    updateFlock(deltaTime) {
        const entity = this.entity;
        let steeringForce = new THREE.Vector3(0, 0, 0);

        // 跟随领袖
        if (this.leader) {
            const followForce = Steerings.Follow(
                entity.position,
                this.leader.position,
                this.leader.forward,
                5
            );
            steeringForce.add(followForce.multiplyScalar(1.0));

            // 分离行为（与群体成员保持距离）
            const separateForce = Steerings.Separate(entity.position, this.neighbors, 3);
            steeringForce.add(separateForce.multiplyScalar(0.8));
        }

        // 避障行为
        const avoidForce = Steerings.Avoid(
            entity.position,
            entity.velocity,
            entity.forward,
            entity.right,
            entity.obstacles,
            5
        );
        steeringForce.add(avoidForce.multiplyScalar(2.0));

        entity.applySteeringForce(steeringForce);
    }

    /**
     * 更新攻击状态
     */
    updateAttack(deltaTime, playerPosition) {
        const entity = this.entity;
        let steeringForce = new THREE.Vector3(0, 0, 0);

        // 追求玩家
        const seekForce = Steerings.Seek(entity.position, playerPosition);
        steeringForce.add(seekForce.multiplyScalar(1.5));

        // 避障行为
        const avoidForce = Steerings.Avoid(
            entity.position,
            entity.velocity,
            entity.forward,
            entity.right,
            entity.obstacles,
            5
        );
        steeringForce.add(avoidForce.multiplyScalar(2.0));

        entity.applySteeringForce(steeringForce);

        // 检查是否到达玩家位置（游戏结束）
        const distanceToPlayer = entity.position.distanceTo(playerPosition);
        if (distanceToPlayer < 3) {
            // 触发游戏结束
            if (window.game) {
                window.game.gameOver();
            }
        }
    }

    /**
     * 更新待机状态
     */
    updateIdling(deltaTime) {
        const entity = this.entity;

        // 只执行避障
        const avoidForce = Steerings.Avoid(
            entity.position,
            entity.velocity,
            entity.forward,
            entity.right,
            entity.obstacles,
            5
        );
        entity.applySteeringForce(avoidForce.multiplyScalar(1.0));

        // 待机时间结束，返回移动状态
        if (this.stateTimer > this.idleTime) {
            this.changeState(AIState.MOVING);
        }
    }

    /**
     * 获取当前状态描述（用于调试）
     */
    getStateDescription() {
        return `State: ${this.currentState}, Timer: ${this.stateTimer.toFixed(2)}`;
    }
}
