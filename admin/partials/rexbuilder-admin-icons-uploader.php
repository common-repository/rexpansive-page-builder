<?php
/**
 * Upload custom icons to the builder live area
 *
 * @since 2.0.0
 */

defined('ABSPATH') or exit;
?>

<h2 class="title"><?php _e( 'Icons', 'rexpansive-builder' ); ?></h2>

<form id="uploadIconsForm" method="post" enctype="multipart/form-data">
	<?php wp_nonce_field( 'upload-icons-nonce', 'uploadIconsNonce' ); ?>
	<table class="form-table">
		<tbody>
			<tr>
				<th>
					<label class="button button-hero" for="uploadIcons"><?php _e( 'Click to upload your custom icons', 'rexpansive-builder' ); ?></label>
					<input type="file" id="uploadIcons" name="files[]" multiple accept="image/svg+xml" />
					<p><span id="icons-num">0</span> <?php _e( 'icons to upload', 'rexpansive-builder' ); ?></p>
					<div id="uploadIconsMsgs">
					</div>
				</th>
				<td>
					<input id="removeIcons" class="button" type="button" value="<?php _e( 'Remove selected', 'rexpansive-builder' ); ?>">
					<div id="iconsSpinner" class="spinner"></div>
					<div id="iconsPreview">
					<?php
					$icons_name_list = Rexbuilder_Utilities::get_icons_name_list();

					if ($icons_name_list)
					{
						foreach ($icons_name_list as $name)
						{
						?>
						<span class="preview-wrap" data-sprite-id="<?php echo $name; ?>">
							<i class="icon">
								<svg><use xlink:href="#<?php echo $name; ?>"></use></svg>
							</i>
							<span class="label"><?php echo $name; ?></span>
						</span>
						<?php
						}
					}
					?>
					</div><!-- preview for icons -->
				</td>
			</tr>
		</tbody>
	</table>
</form>

<div id="spritesContainer">
<?php
$upload_dir = wp_upload_dir();
$uploads_dirname = $upload_dir['basedir'] . '/' . REXPANSIVE_BUILDER_UPLOADS_FOLDER;
if ( file_exists( $uploads_dirname . '/assets/symbol/sprite.symbol.svg' ) )
{
?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><?php include_once( $uploads_dirname . '/assets/symbol/sprite.symbol.svg' ); ?></svg>
<?php
}
?>
</div>