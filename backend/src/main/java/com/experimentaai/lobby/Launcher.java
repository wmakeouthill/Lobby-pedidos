package com.experimentaai.lobby;

public class Launcher {

    private static final String APP_NAME = "lobby";

    public static void main(String[] args) {
        System.setProperty("java.awt.headless", "false");
        System.setProperty("java.awt.application.name", APP_NAME);

        try {
            LobbyPedidosApplication.main(args);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
}
