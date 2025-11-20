package com.experimentaai.lobby.ui;

import com.experimentaai.lobby.exception.StatusWindowException;
import com.experimentaai.lobby.service.NetworkAddressCollector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.Desktop;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;

@Component
public class StatusWindow {

    private static final Logger logger = LoggerFactory.getLogger(StatusWindow.class);
    private static final int WINDOW_WIDTH = 650;
    private static final int WINDOW_HEIGHT = 600;
    private static final String ERROR_ABRIR_NAVEGADOR = "Erro ao abrir navegador: ";
    private static final String URL_LABEL = "\nURL: ";
    private static final String WINDOW_TITLE = "Lobby Pedidos - Experimenta aí";

    private static final Color PRIMARY_ORANGE = new Color(255, 107, 53);
    private static final Color PRIMARY_YELLOW = new Color(255, 213, 79);
    private static final Color PRIMARY_RED = new Color(220, 20, 60);
    private static final Color BACKGROUND_DARK = new Color(40, 40, 40);
    private static final Color CARD_BACKGROUND = new Color(255, 255, 255);
    private static final Color TEXT_SECONDARY = new Color(100, 100, 100);

    private final NetworkAddressCollector addressCollector;
    private final ApplicationContext applicationContext;
    private JFrame frame;
    private volatile boolean windowShown = false;
    private SystemTray systemTray;
    private TrayIcon trayIcon;

    public StatusWindow(NetworkAddressCollector addressCollector, ApplicationContext applicationContext) {
        this.addressCollector = addressCollector;
        this.applicationContext = applicationContext;
    }

    @SuppressWarnings("java:S2139")
    public void show() {
        if (!isGuiAvailable()) {
            logger.warn("GUI não disponível para exibir janela");
            return;
        }

        // Verificar se já existe uma janela com o mesmo título aberta no sistema
        Window existingWindow = findExistingWindow();
        if (existingWindow != null) {
            logger.info("Janela '{}' já está aberta. Trazendo para frente ao invés de criar nova.", WINDOW_TITLE);
            SwingUtilities.invokeLater(() -> {
                existingWindow.toFront();
                existingWindow.requestFocus();
                if (existingWindow instanceof JFrame jframe) {
                    jframe.setState(Frame.NORMAL);
                }
            });
            return;
        }

        // Garantir que apenas uma janela seja criada nesta instância
        synchronized (this) {
            if (windowShown) {
                logger.warn("Janela já foi exibida. Ignorando chamada duplicada.");
                if (frame != null && frame.isVisible()) {
                    frame.toFront();
                    frame.requestFocus();
                }
                return;
            }
            windowShown = true;
        }

        try {
            // Verificar se já estamos na EDT
            if (SwingUtilities.isEventDispatchThread()) {
                // Já estamos na EDT, criar janela diretamente
                createWindow();
                frame.setVisible(true);
                frame.toFront();
                frame.requestFocus();
            } else {
                // Não estamos na EDT, usar invokeAndWait para garantir execução síncrona
                SwingUtilities.invokeAndWait(() -> {
                    createWindow();
                    frame.setVisible(true);
                    frame.toFront();
                    frame.requestFocus();
                });
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            String errorMessage = String.format("Thread interrompida durante criação da janela de status. Thread: %s",
                    Thread.currentThread().getName());
            logger.error(errorMessage, e);
            throw new StatusWindowException(errorMessage, e);
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            String errorMessage = String.format("Erro ao invocar criação da janela de status. Causa: %s [%s]",
                    cause.getClass().getSimpleName(), cause.getMessage());
            logger.error(errorMessage, cause);
            throw new StatusWindowException(errorMessage, cause);
        } catch (Exception e) {
            String errorMessage = String.format("Falha ao exibir janela de status. Causa: %s [%s]",
                    e.getClass().getSimpleName(), e.getMessage());
            logger.error(errorMessage, e);
            throw new StatusWindowException(errorMessage, e);
        }
    }

    private boolean isGuiAvailable() {
        return !GraphicsEnvironment.isHeadless();
    }

    /**
     * Verifica se já existe uma janela com o mesmo título aberta no sistema.
     * Isso previne a abertura de múltiplas janelas quando a aplicação é iniciada
     * várias vezes.
     *
     * @return A janela existente se encontrada, null caso contrário
     */
    private Window findExistingWindow() {
        try {
            Window[] windows = Window.getWindows();
            for (Window window : windows) {
                if (window instanceof JFrame jframe
                        && WINDOW_TITLE.equals(jframe.getTitle())
                        && jframe.isVisible()) {
                    return window;
                }
            }
        } catch (Exception e) {
            logger.warn("Erro ao verificar janelas existentes", e);
        }
        return null;
    }

    private void createWindow() {
        frame = new JFrame(WINDOW_TITLE);
        frame.setDefaultCloseOperation(WindowConstants.DO_NOTHING_ON_CLOSE);
        frame.setResizable(true);
        frame.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
        frame.setLocationRelativeTo(null);
        frame.setMinimumSize(new Dimension(550, 450));

        // Adicionar ícone à janela
        setWindowIcon();

        // Configurar SystemTray
        setupSystemTray();

        frame.addWindowListener(new java.awt.event.WindowAdapter() {
            @Override
            public void windowClosing(java.awt.event.WindowEvent windowEvent) {
                int option = JOptionPane.showConfirmDialog(
                        frame,
                        "Deseja realmente fechar a aplicação?",
                        "Confirmar Fechamento",
                        JOptionPane.YES_NO_OPTION,
                        JOptionPane.QUESTION_MESSAGE);
                if (option == JOptionPane.YES_OPTION) {
                    shutdownApplication();
                }
            }
        });

        JPanel contentPanel = createContentPanel();
        frame.setContentPane(contentPanel);
    }

    private JPanel createContentPanel() {
        JPanel panel = new GradientPanel();
        panel.setLayout(new BorderLayout(15, 15));
        panel.setBorder(new EmptyBorder(20, 20, 20, 20));

        panel.add(createHeaderPanel(), BorderLayout.NORTH);
        panel.add(createAddressesScrollPane(), BorderLayout.CENTER);
        panel.add(createFooterPanel(), BorderLayout.SOUTH);

        return panel;
    }

    private JPanel createHeaderPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setOpaque(false);
        panel.setBorder(new EmptyBorder(0, 0, 15, 0));

        JPanel titlePanel = createTitlePanel();
        JLabel subtitle = createSubtitleLabel();
        JLabel statusBadge = createStatusBadge();

        panel.add(titlePanel, BorderLayout.NORTH);
        panel.add(subtitle, BorderLayout.CENTER);
        panel.add(statusBadge, BorderLayout.SOUTH);

        return panel;
    }

    private JPanel createTitlePanel() {
        JPanel panel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 5));
        panel.setOpaque(false);

        JLabel emoji = new JLabel("🍔");
        emoji.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 28));

        JLabel indicator = new JLabel("●");
        indicator.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 24));
        indicator.setForeground(PRIMARY_YELLOW);

        JLabel title = new JLabel("Sistema Online");
        title.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 24));
        title.setForeground(PRIMARY_RED);

        panel.add(emoji);
        panel.add(indicator);
        panel.add(title);

        return panel;
    }

    private JLabel createSubtitleLabel() {
        JLabel label = new JLabel(WINDOW_TITLE);
        label.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 16));
        label.setForeground(Color.WHITE);
        label.setHorizontalAlignment(SwingConstants.CENTER);
        return label;
    }

    private JLabel createStatusBadge() {
        JLabel badge = new JLabel("✓ Status: Operacional");
        badge.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 12));
        badge.setForeground(Color.WHITE);
        badge.setOpaque(true);
        badge.setBackground(PRIMARY_YELLOW);
        badge.setForeground(PRIMARY_RED);
        badge.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(PRIMARY_RED, 2),
                new EmptyBorder(8, 20, 8, 20)));
        badge.setHorizontalAlignment(SwingConstants.CENTER);
        return badge;
    }

    private JScrollPane createAddressesScrollPane() {
        JPanel addressesPanel = createAddressesPanel();
        JScrollPane scrollPane = new JScrollPane(addressesPanel);
        scrollPane.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createTitledBorder(
                        BorderFactory.createLineBorder(PRIMARY_YELLOW, 2),
                        "📍 Endereços Disponíveis",
                        0, 0,
                        new Font(Font.SANS_SERIF, Font.BOLD, 14),
                        Color.WHITE)));
        scrollPane.setOpaque(false);
        scrollPane.getViewport().setOpaque(false);
        scrollPane.setVerticalScrollBarPolicy(ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED);
        return scrollPane;
    }

    private JPanel createAddressesPanel() {
        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setOpaque(false);
        panel.setBorder(new EmptyBorder(10, 10, 10, 10));

        List<NetworkAddress> addresses = addressCollector.collect();
        for (NetworkAddress address : addresses) {
            panel.add(createAddressCard(address));
            panel.add(Box.createVerticalStrut(12));
        }

        return panel;
    }

    private JPanel createAddressCard(NetworkAddress address) {
        JPanel card = new JPanel(new BorderLayout(15, 10));
        card.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(PRIMARY_ORANGE, 2),
                new EmptyBorder(15, 15, 15, 15)));
        card.setBackground(CARD_BACKGROUND);
        card.setMaximumSize(new Dimension(Integer.MAX_VALUE, 110));

        JLabel typeLabel = createTypeLabel(address.getType());
        JLabel dnsLabel = createDnsLabel(address.getDns());
        JButton openButton = createOpenButton(address.getUrl());

        JPanel infoPanel = new JPanel(new BorderLayout(5, 5));
        infoPanel.setBackground(CARD_BACKGROUND);
        infoPanel.add(typeLabel, BorderLayout.NORTH);
        infoPanel.add(dnsLabel, BorderLayout.CENTER);

        card.add(infoPanel, BorderLayout.CENTER);
        card.add(openButton, BorderLayout.EAST);

        return card;
    }

    private JLabel createTypeLabel(String type) {
        JLabel label = new JLabel(type.toUpperCase());
        label.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 10));
        label.setForeground(TEXT_SECONDARY);
        label.setBorder(new EmptyBorder(0, 0, 8, 0));
        return label;
    }

    private JLabel createDnsLabel(String dns) {
        JLabel label = new JLabel(dns);
        label.setFont(new Font(Font.MONOSPACED, Font.BOLD, 15));
        label.setForeground(PRIMARY_RED);
        return label;
    }

    private JButton createOpenButton(String url) {
        JButton button = new JButton("🌐 Abrir");
        button.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 12));
        button.setBackground(PRIMARY_YELLOW);
        button.setForeground(PRIMARY_RED);
        button.setFocusPainted(false);
        button.setBorderPainted(true);
        button.setBorder(BorderFactory.createLineBorder(PRIMARY_RED, 2));
        button.setCursor(new Cursor(Cursor.HAND_CURSOR));
        button.addActionListener(e -> openInBrowser(url));
        button.addMouseListener(new java.awt.event.MouseAdapter() {
            @Override
            public void mouseEntered(java.awt.event.MouseEvent evt) {
                button.setBackground(PRIMARY_ORANGE);
            }

            @Override
            public void mouseExited(java.awt.event.MouseEvent evt) {
                button.setBackground(PRIMARY_YELLOW);
            }
        });
        return button;
    }

    private JPanel createFooterPanel() {
        NetworkAddressCollector.ServerInfo info = addressCollector.getServerInfo();

        JPanel mainPanel = new JPanel(new BorderLayout(10, 10));
        mainPanel.setOpaque(false);

        // Painel de informações
        JPanel infoPanel = new JPanel(new GridLayout(3, 2, 8, 8));
        infoPanel.setOpaque(false);
        infoPanel.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(PRIMARY_YELLOW, 2),
                "⚙️ Informações do Servidor",
                0, 0,
                new Font(Font.SANS_SERIF, Font.BOLD, 12),
                Color.WHITE));

        addInfoRow(infoPanel, "Hostname:", info.getHostname());
        addInfoRow(infoPanel, "IP:", info.getIpAddress());
        addInfoRow(infoPanel, "Porta:", String.valueOf(info.getPort()));

        // Painel de botões
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 5));
        buttonPanel.setOpaque(false);
        
        JButton minimizeButton = createMinimizeButton();
        buttonPanel.add(minimizeButton);

        mainPanel.add(infoPanel, BorderLayout.CENTER);
        mainPanel.add(buttonPanel, BorderLayout.SOUTH);

        return mainPanel;
    }

    private JButton createMinimizeButton() {
        JButton button = new JButton("📥 Minimizar para Bandeja");
        button.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 12));
        button.setBackground(PRIMARY_YELLOW);
        button.setForeground(PRIMARY_RED);
        button.setFocusPainted(false);
        button.setBorderPainted(true);
        button.setBorder(BorderFactory.createLineBorder(PRIMARY_RED, 2));
        button.setCursor(new Cursor(Cursor.HAND_CURSOR));
        button.addActionListener(e -> minimizeToTray());
        button.addMouseListener(new java.awt.event.MouseAdapter() {
            @Override
            public void mouseEntered(java.awt.event.MouseEvent evt) {
                button.setBackground(PRIMARY_ORANGE);
            }

            @Override
            public void mouseExited(java.awt.event.MouseEvent evt) {
                button.setBackground(PRIMARY_YELLOW);
            }
        });
        return button;
    }

    private void addInfoRow(JPanel panel, String label, String value) {
        JLabel labelComponent = new JLabel(label);
        labelComponent.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 11));
        labelComponent.setForeground(PRIMARY_YELLOW);

        JLabel valueComponent = new JLabel(value);
        valueComponent.setFont(new Font(Font.MONOSPACED, Font.BOLD, 11));
        valueComponent.setForeground(Color.WHITE);

        panel.add(labelComponent);
        panel.add(valueComponent);
    }

    private void openInBrowser(String url) {
        try {
            if (isDesktopBrowseSupported()) {
                Desktop.getDesktop().browse(new URI(url));
            } else {
                openInBrowserFallback(url);
            }
        } catch (URISyntaxException e) {
            String errorMessage = String.format("URL inválida: %s. Erro: %s", url, e.getMessage());
            logger.error(errorMessage, e);
            showError("URL inválida: " + url + "\nErro: " + e.getMessage());
        } catch (IOException e) {
            String errorMessage = String.format("Erro de I/O ao abrir navegador para URL: %s. Erro: %s", url,
                    e.getMessage());
            logger.error(errorMessage, e);
            showError(ERROR_ABRIR_NAVEGADOR + e.getMessage() + URL_LABEL + url);
        } catch (Exception e) {
            String errorMessage = String.format("Erro inesperado ao abrir navegador para URL: %s. Tipo: %s, Erro: %s",
                    url, e.getClass().getSimpleName(), e.getMessage());
            logger.error(errorMessage, e);
            showError(ERROR_ABRIR_NAVEGADOR + e.getMessage() + URL_LABEL + url);
        }
    }

    private boolean isDesktopBrowseSupported() {
        return Desktop.isDesktopSupported()
                && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE);
    }

    private void openInBrowserFallback(String url) {
        String os = System.getProperty("os.name").toLowerCase();
        Runtime runtime = Runtime.getRuntime();

        try {
            if (os.contains("win")) {
                runtime.exec("rundll32 url.dll,FileProtocolHandler " + url);
            } else if (os.contains("mac")) {
                runtime.exec("open " + url);
            } else if (os.contains("nix") || os.contains("nux")) {
                runtime.exec("xdg-open " + url);
            } else {
                showWarning(
                        "Não foi possível abrir o navegador automaticamente.\nPor favor, acesse manualmente: " + url);
            }
        } catch (IOException e) {
            String errorMessage = String.format(
                    "Erro de I/O ao executar comando para abrir navegador. URL: %s, OS: %s, Erro: %s",
                    url, os, e.getMessage());
            logger.error(errorMessage, e);
            showError(ERROR_ABRIR_NAVEGADOR + e.getMessage() + URL_LABEL + url);
        } catch (Exception e) {
            String errorMessage = String.format(
                    "Erro inesperado ao executar comando para abrir navegador. URL: %s, OS: %s, Tipo: %s, Erro: %s",
                    url, os, e.getClass().getSimpleName(), e.getMessage());
            logger.error(errorMessage, e);
            showError(ERROR_ABRIR_NAVEGADOR + e.getMessage() + URL_LABEL + url);
        }
    }

    private void showError(String message) {
        JOptionPane.showMessageDialog(frame, message, "Erro", JOptionPane.ERROR_MESSAGE);
    }

    private void showWarning(String message) {
        JOptionPane.showMessageDialog(frame, message, "Aviso", JOptionPane.WARNING_MESSAGE);
    }

    private void setWindowIcon() {
        try {
            // Tentar carregar ícone dos resources (múltiplos formatos e localizações)
            java.net.URL iconUrl = null;
            Image iconImage = null;
            
            // Método 1: Tentar carregar icon.ico dos resources
            iconUrl = getClass().getResource("/icon.ico");
            if (iconUrl != null) {
                try {
                    // Usar Toolkit para carregar ICO (melhor suporte)
                    iconImage = Toolkit.getDefaultToolkit().getImage(iconUrl);
                    logger.debug("Ícone carregado de /icon.ico via Toolkit");
                } catch (Exception e) {
                    logger.debug("Erro ao carregar icon.ico via Toolkit", e);
                }
            }
            
            // Método 2: Tentar icon.png como fallback
            if (iconImage == null) {
                iconUrl = getClass().getResource("/icon.png");
                if (iconUrl != null) {
                    try {
                        iconImage = new ImageIcon(iconUrl).getImage();
                        logger.debug("Ícone carregado de /icon.png");
                    } catch (Exception e) {
                        logger.debug("Erro ao carregar icon.png", e);
                    }
                }
            }
            
            // Método 3: Tentar carregar do caminho relativo ao executável
            if (iconImage == null) {
                try {
                    java.io.File iconFile = null;
                    // Tentar vários caminhos possíveis
                    String[] possiblePaths = {
                        "../icon/icon.ico",
                        "icon/icon.ico",
                        "../../icon/icon.ico",
                        System.getProperty("user.dir") + "/icon/icon.ico"
                    };
                    
                    for (String path : possiblePaths) {
                        iconFile = new java.io.File(path);
                        if (iconFile.exists() && iconFile.isFile()) {
                            iconImage = Toolkit.getDefaultToolkit().getImage(iconFile.getAbsolutePath());
                            logger.debug("Ícone carregado de: " + iconFile.getAbsolutePath());
                            break;
                        }
                    }
                } catch (Exception e) {
                    logger.debug("Erro ao carregar ícone de caminho relativo", e);
                }
            }
            
            // Se encontrou o ícone, aplicá-lo
            if (iconImage != null) {
                try {
                    // Criar múltiplos tamanhos para melhor compatibilidade
                    java.util.List<Image> iconImages = new java.util.ArrayList<>();
                    
                    // Adicionar a imagem em diferentes tamanhos
                    for (int size : new int[] { 16, 32, 48, 64, 128, 256 }) {
                        Image scaledImage = iconImage.getScaledInstance(size, size, Image.SCALE_SMOOTH);
                        iconImages.add(scaledImage);
                    }
                    
                    // Adicionar também a imagem original
                    iconImages.add(iconImage);
                    
                    frame.setIconImages(iconImages);
                    logger.debug("Ícone aplicado à janela com sucesso");
                    return;
                } catch (Exception e) {
                    logger.warn("Erro ao aplicar ícone à janela", e);
                }
            }

            // Último fallback: usar ícone padrão do sistema (não criar "L")
            logger.warn("Ícone customizado não encontrado, usando ícone padrão do sistema");
            // Não criar ícone programático - deixar o Windows usar o ícone do executável
            
        } catch (Exception e) {
            logger.warn("Não foi possível definir ícone da janela", e);
        }
    }

    private void setupSystemTray() {
        if (!SystemTray.isSupported()) {
            logger.warn("SystemTray não é suportado neste sistema");
            return;
        }

        try {
            systemTray = SystemTray.getSystemTray();
            
            // Criar ícone para a bandeja
            Image trayImage = createTrayIconImage();
            if (trayImage == null) {
                // Criar ícone simples se não conseguir carregar
                trayImage = createDefaultTrayIcon();
            }

            // Criar menu popup para a bandeja
            PopupMenu popup = new PopupMenu();
            
            MenuItem restoreItem = new MenuItem("Restaurar Janela");
            restoreItem.addActionListener(e -> restoreFromTray());
            popup.add(restoreItem);
            
            popup.addSeparator();
            
            MenuItem exitItem = new MenuItem("Sair");
            exitItem.addActionListener(e -> shutdownApplication());
            popup.add(exitItem);

            // Criar TrayIcon
            trayIcon = new TrayIcon(trayImage, WINDOW_TITLE, popup);
            trayIcon.setImageAutoSize(true);
            trayIcon.addActionListener(e -> restoreFromTray());

            // Adicionar à bandeja
            systemTray.add(trayIcon);
            logger.info("Ícone da bandeja configurado com sucesso");
        } catch (AWTException e) {
            logger.error("Erro ao configurar SystemTray", e);
        }
    }

    private Image createTrayIconImage() {
        try {
            // Tentar carregar o ícone dos resources
            java.net.URL iconUrl = getClass().getResource("/icon.ico");
            if (iconUrl != null) {
                return Toolkit.getDefaultToolkit().getImage(iconUrl);
            }
            
            iconUrl = getClass().getResource("/icon.png");
            if (iconUrl != null) {
                return new ImageIcon(iconUrl).getImage();
            }
        } catch (Exception e) {
            logger.debug("Erro ao carregar ícone para bandeja", e);
        }
        return null;
    }

    private Image createDefaultTrayIcon() {
        // Criar um ícone simples programaticamente
        BufferedImage image = new BufferedImage(16, 16, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        
        // Desenhar um círculo laranja com emoji de hambúrguer
        g.setColor(PRIMARY_ORANGE);
        g.fillOval(0, 0, 16, 16);
        g.setColor(Color.WHITE);
        g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 12));
        g.drawString("🍔", 2, 13);
        
        g.dispose();
        return image;
    }

    private void minimizeToTray() {
        if (frame != null && systemTray != null && trayIcon != null) {
            frame.setVisible(false);
            trayIcon.displayMessage(
                WINDOW_TITLE,
                "Aplicação minimizada para a bandeja",
                TrayIcon.MessageType.INFO
            );
            logger.info("Janela minimizada para a bandeja");
        }
    }

    private void restoreFromTray() {
        if (frame != null) {
            frame.setVisible(true);
            frame.setState(Frame.NORMAL);
            frame.toFront();
            frame.requestFocus();
            logger.info("Janela restaurada da bandeja");
        }
    }

    private void shutdownApplication() {
        logger.info("Encerrando aplicação...");
        
        // Remover ícone da bandeja
        if (systemTray != null && trayIcon != null) {
            systemTray.remove(trayIcon);
        }
        
        // Fechar janela
        if (frame != null) {
            frame.dispose();
        }
        
        // Encerrar aplicação Spring Boot
        try {
            if (applicationContext instanceof ConfigurableApplicationContext) {
                ((ConfigurableApplicationContext) applicationContext).close();
            }
        } catch (Exception e) {
            logger.error("Erro ao encerrar aplicação Spring Boot", e);
        }
        
        // Garantir saída completa
        System.exit(0);
    }

    private class GradientPanel extends JPanel {
        @Override
        protected void paintComponent(Graphics g) {
            super.paintComponent(g);
            Graphics2D g2d = (Graphics2D) g.create();

            int width = getWidth();
            int height = getHeight();

            GradientPaint gradient = new GradientPaint(
                    0, 0, PRIMARY_ORANGE,
                    0, height, BACKGROUND_DARK);

            g2d.setPaint(gradient);
            g2d.fillRect(0, 0, width, height);
            g2d.dispose();
        }
    }
}
