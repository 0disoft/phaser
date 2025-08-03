import { GameObjects, Physics, Scene, Types, Math as pMath } from 'phaser';

// 벽돌 클래스를 정의, Phaser의 Rectangle을 상속받음 
class Brick extends GameObjects.Rectangle {
  declare body: Physics.Arcade.Body;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 40, 20, 0xff5733);
    scene.physics.add.existing(this); // 물리 엔진에 이 오브젝트를 추가 
  }
}

// 총알 클래스를 정의, Phaser의 물리 스프라이트를 상속받음
class Bullet extends GameObjects.Arc {
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 5, 0, 360, false, 0xffffff, 1);
  }
}

export class Game extends Scene {
  // 컨테이너와 커서 키 객체를 다른 메서드(update)에서도 사용하기 위해 클래스 변수로 선언 
  private cannonContainer: GameObjects.Container;
  private cursors: Types.Input.Keyboard.CursorKeys;
  private bullets: GameObjects.Group;
  private bricks: GameObjects.Group;
  private bulletSpeed = 160;
  private maxBullets = 2;
  private cannonRotationSpeed = 30; // 대포 회전 속도 변수 
  private brickBaseSpeed = 60; // 벽돌의 기준 낙하 속도 
  private score = 0;
  private scoreText: GameObjects.Text;
  private bulletCountText: GameObjects.Text; // 탄환수 UI 텍스트 
  private speedText: GameObjects.Text; // 속도 UI 텍스트 
  private rotationSpeedText: GameObjects.Text; // 회전 속도 UI 텍스트 

  // 카운터 숫자와 텍스트 오브젝트를 담을 변수를 미리 선언
  constructor() {
    super('Game');
  }

  preload() {
    // this.load.setPath('assets');

    // this.load.image('background', 'bg.png');
    // this.load.image('logo', 'logo.png');
  }

  create() {
    // 파티클 효과에 사용할 8x8 크기의 흰색 픽셀 텍스처를 동적 생성 
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 8, 8);
    graphics.generateTexture('particle', 8, 8);
    graphics.destroy();

    // 벽돌 그룹 생성
    this.bricks = this.physics.add.group({
      classType: Brick,
      runChildUpdate: true,
      allowGravity: false
    });

    // 2초마다 spawnBricks 함수를 반복 실행하는 타이머 등록 
    this.time.addEvent({
      delay: 2000,
      callback: this.spawnBricks,
      callbackScope: this,
      loop: true
    });

    // 총알 그룹 생성
    // 총알을 효율적으로 재사용하기 위해 그룹(오브젝트 풀)을 사용함 
    this.bullets = this.physics.add.group({
      classType: Bullet, // 이 그룹의 멤버는 Bullet 클래스임
      runChildUpdate: true, // 그룹의 자식들이 자신의 update 메서드를 실행하도록 함 
      allowGravity: false, // 총알이 중력의 영향을 받지 않음 
      defaultKey: 'bullet', // 그룹에서 오브젝트를 가져올 때 사용할 기본 키 
      maxSize: this.maxBullets // 생성되는 총알의 최대치
    });
    // this.physics.add.group을 사용했으므로 아래 코드는 필요 없음 
    // this.physics.world.enable(this.bullets); // 그룹 전체에 물리 효과 적용 

    this.createCannonAndUI();
    this.setupInput();

    // 충돌 감지 설정
    // bullets 그룹과 bricks 그룹이 겹쳤을때 handleBrickHit 함수 호출
    this.physics.add.overlap(this.bullets, this.bricks, this.handleBrickHit, undefined, this);
  }

  // create 메서드가 너무 길어져서 별도 함수로 분리 
  createCannonAndUI() {
    // 대포의 각 부분을 따로 만듦
    // 이 오브젝트들의 x,y 좌표는 컨테이너의 중심(0, 0)을 기준으로 함 

    // 몸통 
    const cannonBody = this.add.rectangle(
      0, 0, 20, 40, 0x666666
    );

    // 포구 
    // 몸통의 위쪽 끝에 포구의 중심을 맞춰 y좌표를 설정
    const cannonMuzzle = this.add.rectangle(
      0, -20, 20, 10, 0x000000
    );

    // 컨테이너를 만들고, 위에서 만든 몸통과 포구를 그룹으로 묶음
    // 컨테이너의 위치 자체를 화면 중앙 하단으로 설정함
    this.cannonContainer = this.add.container(
      this.cameras.main.width / 2,
      this.cameras.main.height - 30, // 대포의 아랫부분이 화면에 잘 보이도록 y좌표 조정 
      [cannonBody, cannonMuzzle] // 배열 형태로 자식 오브젝트들을 전달 
    );

    // 컨테이너 전체를 회전시킴
    // 컨테이너를 회전하면 그 안의 자식 오브젝트들도 모두 함께 회전 
    this.cannonContainer.angle = 0;

    // 모든 UI 텍스트 생성을 여기로 통합하고 y좌표를 재정렬 
    const textStyle = {
      fontSize: '18px',
      color: '#ffffff',
      align: 'right'
    };
    const rightAlignX = this.cameras.main.width - 20;

    // 점수 표시 
    this.scoreText = this.add.text(
      rightAlignX,
      20,
      '',
      textStyle
    ).setOrigin(1, 0);

    this.bulletCountText = this.add.text(
      rightAlignX,
      40,
      '',
      textStyle
    ).setOrigin(1, 0); // 기준점을 오른쪽 위로 설정해서 우측 정렬

    this.speedText = this.add.text(
      rightAlignX,
      60,
      '',
      textStyle
    ).setOrigin(1, 0);

    // 회전 속도 UI 텍스트 생성
    this.rotationSpeedText = this.add.text(
      rightAlignX,
      80, // 화면 맨 위로 위치 조정 
      '',
      textStyle
    ).setOrigin(1, 0);
  }

  // create 메서드가 너무 길어져서 별도의 함수로 분리 
  setupInput() {
    // 키보드 입력을 활성화하는 코드 추가
    this.cursors = this.input.keyboard!.createCursorKeys();

    // 스페이스바 입력 감지
    this.input.keyboard?.on('keydown-SPACE', this.fireBullet, this);

    // 풀스크린 기능
    this.input.keyboard?.on('keydown-F', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }

  // 충돌 처리 메서드 추가 
  handleBrickHit(bullet: any, brick: any) {
    // 물리 바디부터 즉시 비활성화해 추가 충돌 원천 차단
    brick.body.enable = false;
    bullet.body.enable = false;

    // 오브젝트를 비활성화하고 화면에서 사라지게 함
    this.bullets.killAndHide(bullet);
    this.bricks.killAndHide(brick);

    // 점수 1점 증가
    this.score++;

    // 파괴 효과 생성
    const particles = this.add.particles(bullet.x, bullet.y, 'particle', {
      speed: 40,
      lifespan: 200,
      blendMode: 'ADD',
      scale: { start: 1, end: 0 },
      quantity: 20
    });

    // 파티클이 모두 사라진 뒤에는 파티클 매니저 자체를 파괴해 리소스를 정리
    this.time.delayedCall(300, () => particles.destroy());
  }

  // 벽돌 생성 및 발사 메서드 추가 
  spawnBricks() {
    // 1~3개의 벽돌을 랜덤하게 생성함
    const brickCount = pMath.Between(1, 3);

    for (let i = 0; i < brickCount; i++) {
      // 그룹에서 비활성 벽돌을 가져옴 
      const brick = this.bricks.get() as Brick;

      if (brick) {
        // 화면 상단 밖, 랜덤한 x 위치에서 시작하도록 설정
        const x = pMath.Between(20, this.cameras.main.width - 20);
        brick.setActive(true).setVisible(true).setPosition(x, -50);
        brick.body.reset(x, -50);

        // 낙하 속도 계산 로직  
        const speedMultiplier = pMath.FloatBetween(0.7, 1.3);
        // 기준 속도에 랜덤 배율을 곱해 최종 속도 결정 
        const finalSpeed = this.brickBaseSpeed * speedMultiplier;

        brick.body.setVelocity(0, finalSpeed);
      }
    }
  }

  // 총알 발사 메서드 
  fireBullet() {
    // 그룹에서 비활성화된 총알을 하나 가져옴. 없으면 새로 생성함 
    const bullet = this.bullets.get() as Bullet;

    if (bullet) {
      if (bullet.body) {
        // 재사용되는 총알의 물리 바디를 명시적으로 다시 활성화 
        (bullet.body as Physics.Arcade.Body).enable = true;

        // 총알의 시작 위치를 대포의 현재 위치와 각도를 기반으로 계산함 
        const angle = pMath.DegToRad(this.cannonContainer.angle - 90); // 각도를 라디안으로 변환 (-90은 보정)
        const muzzlePosition = new pMath.Vector2();
        this.cannonContainer.getWorldTransformMatrix().transformPoint(0, -30, muzzlePosition);

        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.setPosition(muzzlePosition.x, muzzlePosition.y);
        (bullet.body as Physics.Arcade.Body).reset(muzzlePosition.x, muzzlePosition.y);

        // 계산된 각도로 총알에 속도를 부여함 
        this.physics.velocityFromRotation(angle, this.bulletSpeed, (bullet.body as Physics.Arcade.Body).velocity);
      }
    }
  }

  // update 메서드는 매 프레임마다 실행됨
  // 시간과 델타 값을 받도록 수정함 
  update(_time: number, delta: number) {
    // 델타 타임을 이용해 회전 각도를 계산
    // delta는 밀리초 단위이므로 1000으로 나눠 초 단위로 바꿈 
    const rotationAmount = this.cannonRotationSpeed * (delta / 1000);

    // 왼쪽 방향키를 누르고 있으면 
    if (this.cursors.left.isDown) {
      // 대포의 각도를 1씩 감소시켜 왼쪽으로 회전 
      this.cannonContainer.angle -= rotationAmount;
    }
    // 오른쪽 방향키를 누르고 있으면
    else if (this.cursors.right.isDown) {
      // 대포의 각도를 1씩 증가시켜 오른쪽으로 회전시킴 
      this.cannonContainer.angle += rotationAmount;
    }

    // UI 텍스트 업데이트 
    const availableBullets = this.bullets.getTotalFree();
    this.scoreText.setText(`Score: ${this.score}`);
    this.bulletCountText.setText(`Bullets: ${availableBullets} / ${this.maxBullets}`);
    this.speedText.setText(`Speed: ${this.bulletSpeed}`);
    this.rotationSpeedText.setText(`Rotation: ${this.cannonRotationSpeed}`);

    // 화면 밖으로 나간 벽돌 비활성화 처리 
    this.bricks.children.each((b) => {
      const brick = b as Brick;
      // 벽돌이 화면 맨 아래를 완전히 통과하면
      if (brick.active && brick.y > this.cameras.main.height + 50) {
        brick.setActive(false);
      }
      return null;
    });

    // 화면 밖으로 나간 총알을 비활성화 처리함 
    this.bullets.children.each((b) => {
      const bullet = b as GameObjects.Arc;
      if (bullet.active && !this.cameras.main.worldView.contains(bullet.x, bullet.y)) {
        bullet.setActive(false);
        bullet.setVisible(false);
        (bullet.body as Physics.Arcade.Body).stop();
      }
      return null;
    });
  }
}
