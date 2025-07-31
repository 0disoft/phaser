import { GameObjects, Scene, Types } from 'phaser';

export class Game extends Scene {
  // 컨테이너와 커서 키 객체를 다른 메서드(update)에서도 사용하기 위해 클래스 변수로 선언 
  private cannonContainer: GameObjects.Container;
  private cursors: Types.Input.Keyboard.CursorKeys;

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
    // 대포의 각 부분을 따로 만듦
    // 이 오브젝트들의 x,y 좌표는 컨테이너의 중심(0, 0)을 기준으로 함 

    // 몸통 (회색, 가로 50, 세로 100)
    const cannonBody = this.add.rectangle(
      0, 0, 20, 40, 0x666666
    );

    // 포구 (검은색, 가로 50, 세로 20)
    // 몸통의 위쪽 끝(-50)에 포구의 중심(-10)을 맞춰 y좌표를 -60으로 설정
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

    // 키보드 입력을 활성화하는 코드 추가
    this.cursors = this.input.keyboard!.createCursorKeys();

    // 풀스크린 기능
    this.input.keyboard?.on('keydown-F', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }

  // update 메서드는 매 프레임마다 실행됨
  update() {
    // 왼쪽 방향키를 누르고 있으면 
    if (this.cursors.left.isDown) {
      // 대포의 각도를 1씩 감소시켜 왼쪽으로 회전 
      this.cannonContainer.angle -= 1;
    }
    // 오른쪽 방향키를 누르고 있으면
    else if (this.cursors.right.isDown) {
      // 대포의 각도를 1씩 증가시켜 오른쪽으로 회전시킴 
      this.cannonContainer.angle += 1;
    }
  }
}
