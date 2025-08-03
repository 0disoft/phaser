import { GameObjects, Physics, Math as pMath, Scene, Time, Types } from 'phaser';

// 아이템 종류를 명확하게 관리하기 위한 열거형 
enum ItemType {
  RotationSpeed,
  BulletSpeed,
  MaxAmmo,
  Life
}

// 아이템 박스 클래스 정의 
class ItemBox extends GameObjects.Container {
  public declare body: Physics.Arcade.Body;
  public itemType: ItemType;
  private itemTypeText: GameObjects.Text;

  constructor(scene: Scene, x: number, y: number) {
    // 박스 몸체와 텍스트 생성
    const boxBody = new GameObjects.Rectangle(scene, 0, 0, 40, 20, 0x9b59b6);
    const itemTypeText = new GameObjects.Text(scene, 0, 0, '', { fontSize: '13px', color: '#ffffff' });
    itemTypeText.setOrigin(0.5);

    // 컨테이너로 두 오브젝트를 묶음
    super(scene, x, y, [boxBody, itemTypeText]);
    this.itemTypeText = itemTypeText;
    this.setSize(40, 20); // 컨테이너의 물리 크기 설정

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  // 아이템 박스를 재사용할 때 타입을 설정하는 함수 
  public activate(x: number, y: number, type: ItemType) {
    this.itemType = type;
    this.setActive(true);
    this.setVisible(true);
    this.setPosition(x, y);
    this.body.reset(x, y);

    // 타입에 따라 텍스트를 설정
    switch (type) {
      case ItemType.RotationSpeed:
        this.itemTypeText.setText('TURN');
        break;

      case ItemType.BulletSpeed:
        this.itemTypeText.setText('SPEED');
        break;

      case ItemType.MaxAmmo:
        this.itemTypeText.setText('AMMO');
        break;

      case ItemType.Life:
        this.itemTypeText.setText('LIFE');
        break;
    }
  }
}

// 벽돌 클래스를 정의, Phaser의 Rectangle을 상속받음 
class Brick extends GameObjects.Rectangle {
  declare body: Physics.Arcade.Body;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 40, 20, 0xff5733);
    scene.add.existing(this); // 스테이지에 오브젝트 추가 
    scene.physics.add.existing(this); // 물리 엔진에 오브젝트를 추가 
  }
}

// 총알 클래스를 정의, Phaser의 물리 스프라이트를 상속받음
class Bullet extends GameObjects.Arc {
  declare body: Physics.Arcade.Body;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 5, 0, 360, false, 0xffffff, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }
}

export class Game extends Scene {
  // 게임 상태 및 타이머 변수 추가
  private isGameOver = false;
  private brickSpawnTimer: Time.TimerEvent;

  // 컨테이너와 커서 키 객체를 다른 메서드(update)에서도 사용하기 위해 클래스 변수로 선언 
  private cannonContainer: GameObjects.Container;
  private cursors: Types.Input.Keyboard.CursorKeys;
  private bullets: GameObjects.Group;
  private bricks: GameObjects.Group;
  private items: GameObjects.Group;

  private bulletSpeed = 170;
  private maxBullets = 3;
  private cannonRotationSpeed = 40; // 대포 회전 속도 변수 
  private brickBaseSpeed = 55; // 벽돌의 기준 낙하 속도 
  private score = 0;
  private lives = 20;

  private scoreText: GameObjects.Text;
  private bulletCountText: GameObjects.Text; // 탄환수 UI 텍스트 
  private speedText: GameObjects.Text; // 속도 UI 텍스트 
  private rotationSpeedText: GameObjects.Text; // 회전 속도 UI 텍스트 
  private livesText: GameObjects.Text; // 목숨 UI 텍스트 

  // 카운터 숫자와 텍스트 오브젝트를 담을 변수를 미리 선언
  constructor() {
    super('Game');
  }

  preload() {
    this.load.setPath('assets/');

    // this.load.image('background', 'bg.png');
    // this.load.image('logo', 'logo.png');
    this.load.audio('fire-sound', 'sounds/explosion.mp3');
    this.load.audio('hit-sound', 'sounds/hitHurt.mp3');
  }

  create() {
    // 전체 불륨 감소 
    this.sound.setVolume(0.1);

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

    // TODO: 아이템상자 그룹 생성 
    this.items = this.physics.add.group({
      classType: ItemBox,
      runChildUpdate: true,
      allowGravity: false,
    });

    // 2초마다 spawnFallingObjects 함수를 반복 실행하는 타이머 등록 
    // 타이머를 변수에 저장해 나중에 제어할 수 있게 함 
    this.brickSpawnTimer = this.time.addEvent({
      delay: 2000,
      callback: this.spawnFallingObjects,
      callbackScope: this,
      loop: true
    });

    this.createCannonAndUI();
    this.setupInput();

    // 충돌 감지 설정
    // bullets 그룹과 bricks 그룹이 겹쳤을때 handleBrickHit 함수 호출
    this.physics.add.overlap(this.bullets, this.bricks, this.handleBrickHit, undefined, this);
    this.physics.add.overlap(this.bullets, this.items, this.handleItemHit, undefined, this);
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
      80,
      '',
      textStyle
    ).setOrigin(1, 0);

    // 남은 목숨 UI 텍스트 생성
    this.livesText = this.add.text(
      rightAlignX,
      100,
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

    // 벽돌에 맞으면 사운드 재생
    this.sound.play('hit-sound');

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
    this.time.delayedCall(200, () => particles.destroy());
  }

  // 아이템 충돌 처리 메서드 
  handleItemHit(bullet: any, item: any) {
    // any 타입으로 받은 item을 ItemBox 타입으로 형변환
    const itemBox = item as ItemBox;

    // 물리 바디 비활성화
    itemBox.body.enable = false;
    bullet.body.enable = false;

    // 오브젝트 비활성화 
    this.items.killAndHide(itemBox);
    this.bullets.killAndHide(bullet);

    // 아이템박스에 맞으면 사운드 재생 
    this.sound.play('hit-sound');

    // 아이템 타입에 따라 능력치 적용
    switch (itemBox.itemType) {
      case ItemType.RotationSpeed:
        this.cannonRotationSpeed += 5;
        break;

      case ItemType.BulletSpeed:
        this.bulletSpeed += 5;
        break;

      case ItemType.MaxAmmo:
        this.maxBullets++;
        // 총알 그룹의 실제 maxSize 속성도 함께 업데이트
        this.bullets.maxSize = this.maxBullets;
        break;

      case ItemType.Life:
        this.lives++;
        break;
    }

    // 파괴 효과 생성
    const particles = this.add.particles(itemBox.x, itemBox.y, 'particle', {
      speed: 40,
      lifespan: 200,
      blendMode: 'ADD',
      scale: { start: 1, end: 0 },
      quantity: 20,
      tint: 0x9b59b6
    });
    this.time.delayedCall(200, () => particles.destroy());
  }

  // 낙하 오브젝트 생성 (벽돌 또는 아이템)
  spawnFallingObjects() {
    // 이번에 몇개의 오브젝트를 떨어뜨릴지 결정함
    const objectCount = pMath.Between(1, 3);

    // 결정된 개수만큼 반복
    for (let i = 0; i < objectCount; i++) {
      // 루프 안에서 각 오브젝트가 아이템일지 벽돌일지 결정함  
      // 25% 확률로 아이템 박스 생성 
      if (pMath.FloatBetween(0, 1) < 0.25) {
        const item = this.items.get() as ItemBox;
        if (item) {
          const x = pMath.Between(30, this.cameras.main.width - 30);
          // 4가지 아이템 타입 중 하나를 랜덤하게 선택 
          const randomType = pMath.RND.pick([ItemType.RotationSpeed, ItemType.BulletSpeed, ItemType.MaxAmmo, ItemType.Life]);
          item.activate(x, -50 - (i * 60), randomType); // 겹치지 않게 y위치 조정 
          item.body.setVelocity(0, this.brickBaseSpeed * 0.8); // 아이템 낙하 속도 
        }
      } else { // 75% 확률로 벽돌 생성 
        // 그룹에서 비활성 벽돌을 가져옴 
        const brick = this.bricks.get() as Brick;
        if (brick) {
          const x = pMath.Between(20, this.cameras.main.width - 20);
          brick.setActive(true).setVisible(true).setPosition(x, -50 - (i * 60)); // 겹치지 않게 y위치 조정 
          brick.body.reset(x, -50 - (i * 60));

          // 낙하 속도 계산 로직  
          const speedMultiplier = pMath.FloatBetween(0.7, 1.3);
          // 기준 속도에 랜덤 배율을 곱해 최종 속도 결정 
          brick.body.setVelocity(0, this.brickBaseSpeed * speedMultiplier);
        }
      }
    }
  }

  // 총알 발사 메서드 
  fireBullet() {
    // 게임 오버 상태에서는 발사되지 않도록 함 
    if (this.isGameOver) {
      return;
    }

    // 그룹에서 비활성화된 총알을 하나 가져옴. 없으면 새로 생성함 
    const bullet = this.bullets.get() as Bullet;

    if (bullet) {
      // 총알이 성공적으로 발사될 때 사운드 재생
      this.sound.play('fire-sound');

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

  // 게임 오버 실행 메서드 
  triggerGameOver() {
    this.isGameOver = true;

    // 물리 엔진과 벽돌 생성 타이머를 멈춤
    this.physics.pause();
    this.brickSpawnTimer.paused = true;

    // 화면을 어둡게 덮는 반투명 레이어 추가 
    this.add.rectangle(
      this.cameras.main.width / 2, this.cameras.main.height / 2,
      this.cameras.main.width, this.cameras.main.height,
      0x000000, 0.7
    ).setDepth(100); // 다른 UI 요소들보다 위에 있도록 depth 설정

    // 버튼 스타일을 변수로 정의 
    const buttonX = this.cameras.main.width / 2;
    const buttonY = this.cameras.main.height / 2;
    const buttonWidth = 220;
    const buttonHeight = 70;
    const cornerRadius = 20;

    // Graphics 오브젝트를 사용해 버튼 배경 생성 
    const buttonBackground = this.add.graphics()
      .fillStyle(0x555555, 1)
      .fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, cornerRadius);

    // Restart 텍스트 
    const restartText = this.add.text(
      0,
      0,
      'Restart',
      { fontSize: '32px', color: '#00ff00', align: 'center' }
    )
      .setOrigin(0.5);

    // 컨테이너를 만들고 배경과 텍스트를 자식으로 추가 
    const restartButton = this.add.container(
      buttonX,
      buttonY,
      [buttonBackground, restartText],
    )
      .setSize(buttonWidth, buttonHeight) // 컨테이너 크기 지정 
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    // 버튼 클릭시 scene을 재시작
    restartButton.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  // update 메서드는 매 프레임마다 실행됨
  // 시간과 델타 값을 받도록 수정함 
  update(_time: number, delta: number) {
    // 게임 오버 상태에서는 아무것도 업데이트하지 않음
    if (this.isGameOver) {
      return;
    }

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
    this.livesText.setText(`Lives: ${this.lives}`);

    // 화면 밖으로 나간 벽돌 비활성화 처리 및 게임 오버 체크 
    this.bricks.children.each((b: any) => {
      // 벽돌이 화면 맨 아래를 완전히 통과하면
      if (b.active && b.y > this.cameras.main.height + 50) {
        this.lives--; // 목숨 1 감소 
        b.setActive(false);

        // 목숨이 0 이하가 되면 게임 오버 실행
        if (this.lives <= 0) {
          this.triggerGameOver();
        }
      }
      return null;
    });

    // 화면 밖으로 나간 아이템 비활성화 처리
    this.items.children.each((i: any) => {
      if (i.active && i.y > this.cameras.main.height + 50) {
        i.setActive(false);
      }
      return null;
    });

    // 화면 밖으로 나간 총알을 비활성화 처리함 
    this.bullets.children.each((b: any) => {
      if (b.active && !this.cameras.main.worldView.contains(b.x, b.y)) {
        this.bullets.killAndHide(b);
      }
      return null;
    });
  }
}
