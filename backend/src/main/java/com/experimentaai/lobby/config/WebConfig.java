package com.experimentaai.lobby.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Permitir requisições CORS de qualquer origem (útil para desenvolvimento e
        // produção)
        // Como o frontend e backend estão no mesmo servidor, isso garante
        // compatibilidade
        registry.addMapping("/api/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Servir arquivos estáticos do frontend
        // IMPORTANTE: As rotas /api/** são tratadas pelo @RestController e têm
        // prioridade
        // automática sobre os ResourceHandlers. O Spring MVC processa controllers antes
        // de resource handlers.
        // Não registrar handler para /api/** garante que os @RestController sejam
        // consultados primeiro
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        // Ignorar rotas de API e status - retornar null para que o Spring tente outros
                        // handlers
                        // O Spring MVC processa @RestController antes de ResourceHandlers por padrão
                        // Retornar null aqui garante que o Spring continue procurando em outros
                        // handlers
                        if (resourcePath.startsWith("api/") || resourcePath.startsWith("status")) {
                            return null;
                        }

                        Resource requestedResource = location.createRelative(resourcePath);
                        // Se o recurso não existir, retornar index.html (para suportar React Router)
                        return requestedResource.exists() && requestedResource.isReadable()
                                ? requestedResource
                                : new ClassPathResource("/static/index.html");
                    }
                });
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // A rota raiz aponta para o frontend React
        // A interface gráfica Java (StatusWindow) mostra o status quando o servidor
        // inicia
        registry.addViewController("/").setViewName("forward:/index.html");
    }
}
