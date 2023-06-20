import { Server, Socket } from "socket.io";

import { Table } from "../models/Table";
import { User } from "../types/User";
import authController from "../controllers/auth.controller";
import { Room } from "../models/Room";
// import { userService } from "./userService";
// import { logger } from "../helpers";

export default class PokerService {
  private io!: Server;
  public tables: { [key: string]: Table } = {};
  public rooms: { [key: string]: Room } = {};
  public users: Record<string, User> = {};
  public tableCounter: number = 0;
  public roomCounter: number = 0;

  constructor(io: Server) {
    this.io = io;
    this.buildConnection();
    this.createRoom({ type: "NL Texas Hold'em", smallBlind: 1, bigBlind: 2 });
    // this.makeSomeTables();
    // logger.info("Poker game service started");
  }

  buildConnection = () => {
    this.io.on("connection", (socket: Socket) => {
      this.sendMessage(socket, "ping");

      socket.on("joinGame", (data) => this.newConnection(socket));
      // socket.on("createTable", (data) => this.createTable(socket, data));
      socket.on("tableInfo", (data) => this.tableInfo(socket, data));
      socket.on("takeSeat", (data) => this.takeSeat(socket, data));

      socket.on("leaveTable", (data) => this.leaveTable(socket, data));
      socket.on("fold", (data) => this.fold(socket, data));
      socket.on("call", (data) => this.call(socket, data));
      socket.on("raise", (data) => this.raise(socket, data));
      socket.on("check", (data) => this.check(socket, data));
      socket.on("allIn", (data) => this.allIn(socket, data));

      socket.on("disconnect", () => this.disconnect(socket));
      // socket.on("disconnect", (data) => logger.info("disconnected"));
    });
  };

  newConnection = async (socket: Socket) => {
    this.sendMessage(socket, "lobbyInfo", this.lobbyInfo());
  };

  createRoom = async (data: any) => {
    const { type, smallBlind, bigBlind } = data;
    this.rooms[this.roomCounter] = new Room(
      Number(this.roomCounter),
      smallBlind,
      bigBlind,
      "Cash Game"
    );
    for (var i = 0; i < 4; i++) {
      this.createTable({
        name: "aaa",
        type,
        smallBlind,
        bigBlind,
        roomid: this.roomCounter,
      });
    }
    this.roomCounter++;
  };

  createTable = async (data: any) => {
    console.log("request to create");
    const { address, name, type, smallBlind, bigBlind, buyIn, roomid } = data;
    // if (!address || !name || !type || !smallBlind || !bigBlind || !buyIn) {
    //   this.sendMessage(socket, "error", "Invalid data");
    //   return;
    // }

    // const user = await authController.getUser(address);

    // if ((user && user.balance.ebone < buyIn) || buyIn < bigBlind * 10) {
    //   this.sendMessage(socket, "error", "Not enough chips to create the table");
    //   return;
    // }

    // logger.info("creating from ", data);
    // logger.info("table created ID:", this.tableCounter);
    this.tables[this.tableCounter] = new Table(
      this.io,
      Number(this.tableCounter),
      name,
      type,
      smallBlind,
      bigBlind,
      roomid
    );

    this.rooms[roomid].tables.push(this.tableCounter);
    // await this.takeSeat(socket, {
    //   address,
    //   tableId: this.tableCounter,
    //   position: 0,
    //   buyIn,
    // });
    this.tableCounter++;
    this.broadcastMessage("lobbyInfo", this.lobbyInfo());
  };

  tableInfo = async (socket: Socket, data: any) => {
    const { address, tableId } = data;
    if (!address || typeof tableId == undefined) {
      this.sendMessage(socket, "error", "Invalid data");
      return;
    }
    this.sendMessage(
      socket,
      "tableInfo",
      await this.tables[tableId].info(address)
    );
    socket.join("room-" + tableId);
  };

  takeSeat = async (socket: Socket, data: any) => {
    const { address, tableId, position, buyIn } = data;
    if (
      !address ||
      typeof tableId == undefined ||
      typeof position == undefined ||
      typeof buyIn == undefined ||
      !this.tables[tableId] ||
      position >= 6
    ) {
      this.sendMessage(socket, "error", "Invalid data");
      return;
    }
    const table = this.tables[tableId];
    if (table?.players[position]?.address) {
      this.sendMessage(
        socket,
        "error",
        "That seat is already taken by other one"
      );
      return;
    }
    if (table.getPosition(address) >= 0) {
      this.sendMessage(
        socket,
        "error",
        "You already participated in the table"
      );
      return;
    }
    const user = await authController.getUser(address);
    if (user) {
      if (user.balance.ebone < buyIn || buyIn < table.minBuyIn) {
        this.sendMessage(
          socket,
          "error",
          `You need at least ${table.minBuyIn}chips`
        );
        return;
      }
      user.balance.ebone -= buyIn;
      authController.updateUser(user);

      table.takeSeat(
        {
          socket,
          address,
          stack: buyIn,
          betAmount: 0,
          totalBet: 0,
          status: "FOLD",
          cards: [] as number[],
          position: data.position,
        },
        data.position
      );

      console.log(
        `${address} is taking seat at ${position} on table ${tableId}`
      );

      this.tableInfo(socket, { address, tableId });
    }
  };

  lobbyInfo = () => {
    let data = Object.values(this.rooms).map((room) => room.infoForLobby());
    return data;
  };

  // table actions
  check = async (socket: Socket, data: any) => {
    this.tables[data.id].check();
  };

  fold = async (socket: Socket, data: any) => {
    this.tables[data.id].fold();
  };

  call = async (socket: Socket, data: any) => {
    this.tables[data.id].call();
  };

  raise = async (socket: Socket, data: any) => {
    this.tables[data.id].raise(data.amount);
  };

  allIn = async (socket: Socket, data: any) => {
    this.tables[data.id].allIn();
  };

  leaveTable = async (socket: Socket, data: any) => {
    this.tables[data.id].leaveSeat(data.position);
  };

  sendMessage = (socket: Socket, channel: string, data: any = {}) => {
    socket.emit(channel, data);
  };

  broadcastMessage = (channel: string, data: any = {}) => {
    this.io.emit(channel, data);
  };

  disconnect = (socket: Socket) => {
    Object.keys(this.tables).forEach((key) => {
      let table = this.tables[key];
      let pos = table.getPlayerPosition(socket);
      if (pos >= 0) table.leaveSeat(pos);
    });
    this.broadcastMessage("lobbyInfo", this.lobbyInfo());
  };
}
