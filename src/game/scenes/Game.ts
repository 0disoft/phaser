import { Scene } from 'phaser';

export class Game extends Scene {
  constructor() {
    super('Game');
  }

  preload() {
    // this.load.setPath('assets');

    // this.load.image('background', 'bg.png');
    // this.load.image('logo', 'logo.png');
  }

  create() {
    // 텍스트 오브젝트 생성 코드 
    this.add.text(
      this.cameras.main.width / 2, // x 좌표 (화면 가로 중앙)
      this.cameras.main.height / 2, // y좌표 (화면 세로 중앙)
      'Hello, Phaser', // 출력할 텍스트 
      {
        fontFamily: 'Arial',
        fontSize: '64px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5); // 텍스트의 기준점을 중앙으로 맞춰 정중앙에 위치시킴 

  }
}
