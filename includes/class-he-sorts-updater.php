<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class HE_Sorts_Updater {

	const GITHUB_USER = 'he-works';
	const GITHUB_REPO = 'wp-he-sorts';
	const CACHE_TTL   = 43200; // 12시간

	private $plugin_file;
	private $plugin_slug;
	private $current_version;

	public function __construct( $plugin_file ) {
		$this->plugin_file     = $plugin_file;
		$this->plugin_slug     = plugin_basename( $plugin_file );
		$this->current_version = HE_SORTS_VERSION;
	}

	public function register_hooks() {
		add_filter( 'pre_set_site_transient_update_plugins', array( $this, 'check_for_update' ) );
		add_filter( 'plugins_api', array( $this, 'plugin_info' ), 10, 3 );
		add_filter( 'upgrader_post_install', array( $this, 'after_install' ), 10, 3 );
	}

	public function check_for_update( $transient ) {
		if ( empty( $transient->checked ) ) {
			return $transient;
		}

		$release = $this->get_latest_release();
		if ( ! $release ) {
			return $transient;
		}

		$remote_version = ltrim( $release['tag_name'], 'v' );
		if ( version_compare( $this->current_version, $remote_version, '<' ) ) {
			$transient->response[ $this->plugin_slug ] = (object) array(
				'slug'        => dirname( $this->plugin_slug ),
				'plugin'      => $this->plugin_slug,
				'new_version' => $remote_version,
				'url'         => 'https://github.com/' . self::GITHUB_USER . '/' . self::GITHUB_REPO,
				'package'     => $this->get_download_url( $release ),
			);
		}

		return $transient;
	}

	public function plugin_info( $result, $action, $args ) {
		if ( $action !== 'plugin_information' ) {
			return $result;
		}
		if ( ! isset( $args->slug ) || $args->slug !== dirname( $this->plugin_slug ) ) {
			return $result;
		}

		$release = $this->get_latest_release();
		if ( ! $release ) {
			return $result;
		}

		$remote_version = ltrim( $release['tag_name'], 'v' );

		return (object) array(
			'name'          => 'HE SORTS',
			'slug'          => dirname( $this->plugin_slug ),
			'version'       => $remote_version,
			'author'        => '<a href="https://github.com/he-works">HE WORKS.</a>',
			'homepage'      => 'https://github.com/' . self::GITHUB_USER . '/' . self::GITHUB_REPO,
			'requires'      => '5.0',
			'tested'        => '6.7',
			'requires_php'  => '7.4',
			'last_updated'  => $release['published_at'],
			'sections'      => array(
				'description' => 'WordPress 관리자 메뉴를 드래그 앤 드롭으로 정렬·이름 변경·커스텀 항목 추가할 수 있는 플러그인입니다.',
				'changelog'   => nl2br( esc_html( $release['body'] ?? '' ) ),
			),
			'download_link' => $this->get_download_url( $release ),
		);
	}

	public function after_install( $response, $hook_extra, $result ) {
		if ( ! isset( $hook_extra['plugin'] ) || $hook_extra['plugin'] !== $this->plugin_slug ) {
			return $result;
		}

		global $wp_filesystem;

		$plugin_folder = WP_PLUGIN_DIR . DIRECTORY_SEPARATOR . dirname( $this->plugin_slug );
		$wp_filesystem->move( $result['destination'], $plugin_folder );
		$result['destination'] = $plugin_folder;

		activate_plugin( $this->plugin_slug );

		return $result;
	}

	private function get_latest_release() {
		$cached = get_transient( 'he_sorts_github_release' );
		if ( $cached !== false ) {
			return $cached;
		}

		$url      = 'https://api.github.com/repos/' . self::GITHUB_USER . '/' . self::GITHUB_REPO . '/releases/latest';
		$response = wp_remote_get( $url, array(
			'headers' => array( 'Accept' => 'application/vnd.github.v3+json' ),
			'timeout' => 10,
		) );

		if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
			return false;
		}

		$release = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $release['tag_name'] ) ) {
			return false;
		}

		set_transient( 'he_sorts_github_release', $release, self::CACHE_TTL );

		return $release;
	}

	private function get_download_url( $release ) {
		if ( ! empty( $release['assets'] ) ) {
			foreach ( $release['assets'] as $asset ) {
				if ( substr( $asset['name'], -4 ) === '.zip' ) {
					return $asset['browser_download_url'];
				}
			}
		}

		return 'https://github.com/' . self::GITHUB_USER . '/' . self::GITHUB_REPO . '/archive/refs/heads/main.zip';
	}
}
