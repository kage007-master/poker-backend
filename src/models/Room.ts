import { Table } from "./Table";

export class Room {
  id!: number;
  smallBlind!: number;
  bigBlind!: number;
  minBuyIn!: number;
  maxBuyIn!: number;
  type: "Cash Game" | "SNG";
  tables: number[] = [];

  constructor(
    _id: number,
    _smallBlind: number,
    _bigBlind: number,
    type: "Cash Game" | "SNG"
  ) {
    this.id = _id;
    this.type = type;
    this.smallBlind = _smallBlind;
    this.bigBlind = _bigBlind;
    this.minBuyIn = _bigBlind * 10;
    this.maxBuyIn = _bigBlind * 200;
  }
  infoForLobby() {
    const { smallBlind, bigBlind, minBuyIn, maxBuyIn, type } = this;
    return {
      smallBlind,
      bigBlind,
      minBuyIn,
      maxBuyIn,
      type,
      tableCnts: this.tables.length,
    };
  }
}
