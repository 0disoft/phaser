import { Scene } from 'phaser';

export class Game extends Scene {
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
    // 대포 역할을 할 직사각형을 만듦
    const cannon = this.add.rectangle(
      this.cameras.main.width / 2, // x좌표: 화면 가로 중앙
      this.cameras.main.height, // y좌표: 화면 맨 아래 
      20, // 가로 크기 
      40, // 세로 크기
      0x666666 // 색상: 회색 
    );

    // 대포의 회전 기준점을 아래쪽 중앙으로 설정함
    cannon.setOrigin(0.5, 1);

    // 대포의 각도를 설정함
    // Phaser에선 0도가 오른쪽 방향이므로 위쪽을 보려면 -90도로 설정해야 함 
    cannon.angle = 0;

    // 풀스크린 기능
    this.input.keyboard?.on('keydown-F', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }
}
