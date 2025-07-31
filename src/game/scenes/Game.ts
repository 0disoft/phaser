import { Scene } from 'phaser';

export class Game extends Scene {
  // 카운터 숫자와 텍스트 오브젝트를 담을 변수를 미리 선언
  private counterValue: number;
  private counterText: Phaser.GameObjects.Text;
  constructor() {
    super('Game');
  }

  preload() {
    // this.load.setPath('assets');

    // this.load.image('background', 'bg.png');
    // this.load.image('logo', 'logo.png');
  }

  create() {
    // 카운터 초기값을 0으로 설정
    this.counterValue = 0;

    // 숫자를 표시할 텍스트 오브젝트를 화면에 추가
    this.counterText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      `Count: ${this.counterValue}`,
      { fontSize: '48px', color: '#ffffff' }
    ).setOrigin(0.5);

    // 클릭할 버튼 역할을 할 텍스트 오브젝트를 추가함
    const button = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 50,
      '증가',
      {
        fontSize: '32px',
        color: '#00ff00',
        backgroundColor: '#555555',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);

    // 버튼에 상호작용을 활성화함
    button.setInteractive({ useHandCursor: true }); // 마우스를 올리면 손가락 커서로

    // 버튼에 'pointerdown' (클릭) 이벤트를 감지하는 리스너 추가 
    button.on('pointerdown', () => {
      // 카운터 값을 1 증가시킴
      this.counterValue++;
      // 숫자를 표시하는 텍스트의 내용을 업데이트함 
      this.counterText.setText(`Count: ${this.counterValue}`);
    });
  }
}
